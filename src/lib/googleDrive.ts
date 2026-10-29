export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
}

/**
 * List files from user's Google Drive
 */
export async function listDriveFiles(
  accessToken: string,
  options: {
    searchTerm?: string;
    fileCategory?: 'all' | 'pdf' | 'excel' | 'word' | 'image';
    pageSize?: number;
  } = {}
): Promise<DriveFileItem[]> {
  const { searchTerm, fileCategory = 'all', pageSize = 30 } = options;

  let query = "trashed = false";

  if (searchTerm && searchTerm.trim()) {
    query += ` and name contains '${searchTerm.replace(/'/g, "\\'")}'`;
  }

  if (fileCategory === 'pdf') {
    query += " and mimeType = 'application/pdf'";
  } else if (fileCategory === 'excel') {
    query += " and (mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType = 'application/vnd.ms-excel' or mimeType = 'application/vnd.google-apps.spreadsheet')";
  } else if (fileCategory === 'word') {
    query += " and (mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'application/msword' or mimeType = 'application/vnd.google-apps.document')";
  } else if (fileCategory === 'image') {
    query += " and mimeType contains 'image/'";
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', query);
  url.searchParams.set('pageSize', pageSize.toString());
  url.searchParams.set('fields', 'files(id, name, mimeType, size, modifiedTime, iconLink, thumbnailLink, webViewLink)');
  url.searchParams.set('orderBy', 'modifiedTime desc');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive API 错误 (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Download file content as Blob
 */
export async function downloadDriveFile(
  fileId: string,
  mimeType: string,
  accessToken: string
): Promise<{ blob: Blob; fileName?: string }> {
  // If it's a Google Workspace native doc (Docs, Sheets), use export API
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('导出 Google 表格失败');
    return { blob: await res.blob() };
  }

  if (mimeType === 'application/vnd.google-apps.document') {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document`;
    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('导出 Google 文档失败');
    return { blob: await res.blob() };
  }

  // Standard binary download
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`下载 Google Drive 文件失败: ${res.statusText}`);
  }

  return { blob: await res.blob() };
}

/**
 * Upload a file directly to Google Drive
 */
export async function uploadToDrive(
  fileName: string,
  blob: Blob,
  mimeType: string,
  accessToken: string
): Promise<DriveFileItem> {
  const metadata = {
    name: fileName,
    mimeType: mimeType,
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', blob);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`上传文件到 Google Drive 失败: ${errText}`);
  }

  return await res.json();
}

/**
 * Delete a file from Google Drive (Mandatory user confirmation handled by caller)
 */
export async function deleteDriveFile(
  fileId: string,
  accessToken: string
): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`删除 Google Drive 文件失败: ${res.statusText}`);
  }
}
