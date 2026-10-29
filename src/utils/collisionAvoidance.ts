import type { TextBlock, AnnotationPill } from '../types.ts';
import { isPureMetricOrNumeric } from './apparelTerms.ts';

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Check if two rectangles overlap
 */
export function rectsIntersect(r1: Rect, r2: Rect): boolean {
  return !(
    r1.x1 <= r2.x0 ||
    r1.x0 >= r2.x1 ||
    r1.y1 <= r2.y0 ||
    r1.y0 >= r2.y1
  );
}

/**
 * Estimate width of Chinese text in points
 */
export function estimatePillDimensions(text: string, fontSize: number = 10): { width: number; height: number } {
  const chars = text.length;
  let cjkCount = 0;
  let latinCount = 0;
  for (let i = 0; i < chars; i++) {
    if (text.charCodeAt(i) > 255) {
      cjkCount++;
    } else {
      latinCount++;
    }
  }
  const textWidth = cjkCount * (fontSize * 1.05) + latinCount * (fontSize * 0.58);
  const height = fontSize + 2;
  const width = Math.max(textWidth + 4, 18);
  return { width, height };
}

/**
 * Check if a candidate rectangle collides with any forbidden zone (expanded with safety margin)
 */
function checkCollision(candidate: Rect, forbiddenRects: Rect[], safetyBuffer: number = 2.0): boolean {
  for (const r of forbiddenRects) {
    const expanded: Rect = {
      x0: r.x0 - safetyBuffer,
      y0: r.y0 - safetyBuffer,
      x1: r.x1 + safetyBuffer,
      y1: r.y1 + safetyBuffer
    };
    if (rectsIntersect(candidate, expanded)) {
      return true;
    }
  }
  return false;
}

/**
 * Find strictly collision-free placement staggered and offset from original English text:
 * Priority 1: Right-side offset in same line/cell (x = x1 + 6.0)
 * Priority 2: Below with clean line spacing (y = y1 + 1.5)
 * Priority 3: Above with clean line spacing (y = y0 - height - 1.5)
 * Priority 4: Staggered blank margin slot
 */
export function calculatePillPlacement(
  targetBlock: TextBlock,
  translationText: string,
  existingForbiddenRects: Rect[],
  pageWidth: number,
  pageHeight: number,
  fontSize: number = 10
): { x: number; y: number; width: number; height: number; placement: 'below' | 'above' | 'right' | 'margin' } {
  const { width: pillWidth, height: pillHeight } = estimatePillDimensions(translationText, fontSize);
  const safetyBuffer = 2.0;

  // 1. Right side offset: ideal for spec sheets, callout lines, and POM tables
  const candRight: Rect = {
    x0: targetBlock.x1 + 6.0,
    y0: targetBlock.y0 + Math.max(0, (targetBlock.y1 - targetBlock.y0 - pillHeight) / 2),
    x1: targetBlock.x1 + 6.0 + pillWidth,
    y1: targetBlock.y0 + Math.max(0, (targetBlock.y1 - targetBlock.y0 - pillHeight) / 2) + pillHeight
  };
  if (candRight.x1 <= pageWidth - 10 && candRight.y0 >= 6 && candRight.y1 <= pageHeight - 6) {
    if (!checkCollision(candRight, existingForbiddenRects, safetyBuffer)) {
      return { x: Math.round(candRight.x0), y: Math.round(candRight.y0), width: pillWidth, height: pillHeight, placement: 'right' };
    }
  }

  // 2. Below English text with clean clearance (zero overlap)
  const candBelow: Rect = {
    x0: targetBlock.x0,
    y0: targetBlock.y1 + 1.5,
    x1: targetBlock.x0 + pillWidth,
    y1: targetBlock.y1 + 1.5 + pillHeight
  };
  if (candBelow.x1 <= pageWidth - 10 && candBelow.y1 <= pageHeight - 6) {
    if (!checkCollision(candBelow, existingForbiddenRects, safetyBuffer)) {
      return { x: Math.round(candBelow.x0), y: Math.round(candBelow.y0), width: pillWidth, height: pillHeight, placement: 'below' };
    }
  }

  // 3. Above English text with clean clearance
  const candAbove: Rect = {
    x0: targetBlock.x0,
    y0: targetBlock.y0 - pillHeight - 1.5,
    x1: targetBlock.x0 + pillWidth,
    y1: targetBlock.y0 - 1.5
  };
  if (candAbove.y0 >= 6 && candAbove.x1 <= pageWidth - 10) {
    if (!checkCollision(candAbove, existingForbiddenRects, safetyBuffer)) {
      return { x: Math.round(candAbove.x0), y: Math.round(candAbove.y0), width: pillWidth, height: pillHeight, placement: 'above' };
    }
  }

  // 4. Staggered margin column search: probe vertical slots in outer right blank zone
  const marginColX = Math.min(pageWidth - pillWidth - 12, Math.max(pageWidth * 0.65, targetBlock.x1 + 12));
  for (let offsetY = -16; offsetY <= 48; offsetY += 6) {
    const testY = targetBlock.y0 + offsetY;
    if (testY < 8 || testY + pillHeight > pageHeight - 8) continue;
    const candMargin: Rect = {
      x0: marginColX,
      y0: testY,
      x1: marginColX + pillWidth,
      y1: testY + pillHeight
    };
    if (!checkCollision(candMargin, existingForbiddenRects, 1.5)) {
      return { x: Math.round(candMargin.x0), y: Math.round(candMargin.y0), width: pillWidth, height: pillHeight, placement: 'margin' };
    }
  }

  // Fallback: place without invading numeric columns
  let fallbackX = targetBlock.x1 + 6.0;
  let fallbackY = targetBlock.y0;
  if (fallbackX + pillWidth > pageWidth - 10) {
    fallbackX = Math.max(8, targetBlock.x0);
    fallbackY = Math.min(pageHeight - pillHeight - 6, targetBlock.y1 + 1.5);
  }

  return {
    x: Math.round(fallbackX),
    y: Math.round(fallbackY),
    width: pillWidth,
    height: pillHeight,
    placement: 'right'
  };
}

/**
 * Generate in-place bilingual annotations for all eligible text blocks on a page
 */
export function generateInPlaceAnnotations(
  blocks: TextBlock[],
  pageWidth: number,
  pageHeight: number,
  fontSize: number = 10,
  filterPureNumeric: boolean = true
): AnnotationPill[] {
  // Collect all base blocks as initial forbidden zones
  const forbiddenRects: Rect[] = blocks.map(b => ({
    x0: b.x0,
    y0: b.y0,
    x1: b.x1,
    y1: b.y1
  }));

  const pills: AnnotationPill[] = [];

  for (const block of blocks) {
    // 1. Skip pure numbers, tolerances, sizes, and metric codes
    if (filterPureNumeric && (block.isMetric || isPureMetricOrNumeric(block.text))) {
      continue;
    }
    // 2. Skip if translation is missing or empty
    const trans = block.translation?.trim() || '';
    if (!trans) {
      continue;
    }
    // 3. Skip if translation is identical to original text (e.g. untranslated English or repeated number)
    if (trans.toLowerCase() === block.text.trim().toLowerCase()) {
      continue;
    }
    // 4. CRITICAL: For bilingual annotation pills in Chinese, the translation MUST contain Chinese characters!
    // Never render a pill for non-Chinese text or untranslated numbers/symbols
    if (!/[\u4e00-\u9fa5]/.test(trans)) {
      continue;
    }

    const placement = calculatePillPlacement(
      block,
      trans,
      forbiddenRects,
      pageWidth,
      pageHeight,
      fontSize
    );

    // Add this new annotation to forbidden rects so subsequent annotations do not overlap with it
    const pillRect: Rect = {
      x0: placement.x,
      y0: placement.y,
      x1: placement.x + placement.width,
      y1: placement.y + placement.height
    };
    forbiddenRects.push(pillRect);

    pills.push({
      id: `pill-${block.id}`,
      blockId: block.id,
      originalText: block.text,
      translation: trans,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      placement: placement.placement,
      fontSize,
      pageNumber: block.pageNumber,
      visible: true
    });
  }

  return pills;
}
