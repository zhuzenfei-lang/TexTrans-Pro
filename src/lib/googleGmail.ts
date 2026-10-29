export interface GmailMessageItem {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  bodyText?: string;
}

/**
 * Helper: Decode base64url string to UTF-8
 */
function decodeBase64Url(base64Url: string): string {
  try {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    console.warn('Failed to decode base64url', err);
    return '';
  }
}

/**
 * Extract plain text body from Gmail message payload parts recursively
 */
function extractBodyFromPayload(payload: any): string {
  if (!payload) return '';

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    // First look for text/plain
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Then recurse
    for (const part of payload.parts) {
      const text = extractBodyFromPayload(part);
      if (text) return text;
    }
  }

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  return '';
}

/**
 * List recent messages or search messages from user's Gmail
 */
export async function listGmailMessages(
  accessToken: string,
  options: {
    query?: string;
    maxResults?: number;
  } = {}
): Promise<GmailMessageItem[]> {
  const { query = '', maxResults = 20 } = options;

  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  if (query.trim()) {
    url.searchParams.set('q', query);
  }
  url.searchParams.set('maxResults', maxResults.toString());

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail API 错误 (${res.status}): ${errText}`);
  }

  const listData = await res.json();
  const rawList: Array<{ id: string; threadId: string }> = listData.messages || [];

  if (rawList.length === 0) return [];

  // Fetch details for each message (first 15 for responsiveness)
  const detailPromises = rawList.slice(0, 15).map(async (msg) => {
    try {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!detailRes.ok) return null;
      const detail = await detailRes.json();

      const headers: Array<{ name: string; value: string }> = detail.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const bodyText = extractBodyFromPayload(detail.payload);

      return {
        id: detail.id,
        threadId: detail.threadId,
        subject: getHeader('Subject') || '(无主题)',
        from: getHeader('From') || '(未知发件人)',
        to: getHeader('To') || '',
        date: getHeader('Date') || '',
        snippet: detail.snippet || '',
        bodyText: bodyText || detail.snippet || '',
      } as GmailMessageItem;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(detailPromises);
  return results.filter((item): item is GmailMessageItem => item !== null);
}

/**
 * Encode an email message into RFC 2822 base64url format
 */
function createRawEmail(to: string, subject: string, body: string): string {
  // RFC 2822 format with UTF-8
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    to ? `To: ${to}` : '',
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    body,
  ].filter((line, idx) => idx === 0 ? Boolean(to) : true);

  const rawMessage = messageParts.join('\r\n');
  // Base64url encode
  const base64 = btoa(unescape(encodeURIComponent(rawMessage)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Create a draft in Gmail
 */
export async function createGmailDraft(
  to: string,
  subject: string,
  body: string,
  accessToken: string
): Promise<{ id: string }> {
  const raw = createRawEmail(to, subject, body);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`创建 Gmail 草稿失败: ${errText}`);
  }

  return await res.json();
}

/**
 * Send an email directly via Gmail (Requires explicit user confirmation handled by caller)
 */
export async function sendGmailMessage(
  to: string,
  subject: string,
  body: string,
  accessToken: string
): Promise<{ id: string; threadId: string }> {
  const raw = createRawEmail(to, subject, body);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`发送 Gmail 邮件失败: ${errText}`);
  }

  return await res.json();
}
