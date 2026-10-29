import type { TextBlock } from '../types.ts';
import { lookupApparelTerm, isPureMetricOrNumeric } from './apparelTerms.ts';

export interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Cluster adjacent text items that share the same horizontal baseline and are close together
 * into coherent phrases (e.g. ["1/2", "CHEST", "WIDTH"] -> "1/2 CHEST WIDTH")
 */
export function clusterTextItems(
  items: RawTextItem[],
  pageNumber: number = 1
): TextBlock[] {
  if (items.length === 0) return [];

  // Filter out pure whitespace
  const validItems = items.filter(it => it.str && it.str.trim() !== '');
  if (validItems.length === 0) return [];

  // Sort by Y ascending (top to bottom), then X ascending (left to right)
  validItems.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 4) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  const clusters: TextBlock[] = [];
  let currentGroup: RawTextItem[] = [validItems[0]];

  for (let i = 1; i < validItems.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = validItems[i];

    // Check if on same line (within 4 points in Y) and close horizontally (within 16 points in X)
    const sameLine = Math.abs(curr.y - prev.y) <= 4;
    const prevRight = prev.x + prev.width;
    const horizontalGap = curr.x - prevRight;

    if (sameLine && horizontalGap >= -2 && horizontalGap <= 16) {
      currentGroup.push(curr);
    } else {
      // Finalize current group
      clusters.push(createBlockFromGroup(currentGroup, clusters.length + 1, pageNumber));
      currentGroup = [curr];
    }
  }

  if (currentGroup.length > 0) {
    clusters.push(createBlockFromGroup(currentGroup, clusters.length + 1, pageNumber));
  }

  return clusters;
}

function createBlockFromGroup(
  group: RawTextItem[],
  index: number,
  pageNumber: number
): TextBlock {
  const text = group.map(g => g.str.trim()).join(' ').replace(/\s+/g, ' ');
  const x0 = Math.min(...group.map(g => g.x));
  const y0 = Math.min(...group.map(g => g.y));
  const x1 = Math.max(...group.map(g => g.x + g.width));
  const y1 = Math.max(...group.map(g => g.y + g.height));

  const isMetric = isPureMetricOrNumeric(text);
  const translation = isMetric ? '' : (lookupApparelTerm(text) || '');

  let category: TextBlock['category'] = 'general';
  const upper = text.toUpperCase();
  if (upper.includes('CHEST') || upper.includes('LENGTH') || upper.includes('WAIST') || upper.includes('SHOULDER') || upper.includes('HPS') || upper.includes('POM') || upper.includes('ARMHOLE')) {
    category = 'pom';
  } else if (upper.includes('STITCH') || upper.includes('SEAM') || upper.includes('BARTACK') || upper.includes('OVERLOCK') || upper.includes('HEM')) {
    category = 'sewing';
  } else if (upper.includes('COTTON') || upper.includes('POLY') || upper.includes('TERRY') || upper.includes('RIB') || upper.includes('FABRIC')) {
    category = 'fabric';
  } else if (upper.includes('ZIPPER') || upper.includes('CORD') || upper.includes('BUTTON') || upper.includes('LABEL') || upper.includes('EYELET')) {
    category = 'trim';
  }

  return {
    id: `pdf-blk-${pageNumber}-${index}`,
    text,
    x0: Math.round(x0),
    y0: Math.round(y0),
    x1: Math.round(x1),
    y1: Math.round(y1),
    pageNumber,
    translation,
    category,
    isMetric
  };
}
