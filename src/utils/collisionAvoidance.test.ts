import test from 'node:test';
import assert from 'node:assert/strict';
import { rectsIntersect, estimatePillDimensions, calculatePillPlacement } from './collisionAvoidance.ts';
import type { Rect } from './collisionAvoidance.ts';
import type { TextBlock } from '../types.ts';

test('rectsIntersect detects overlapping and separated boxes', () => {
  const r1: Rect = { x0: 10, y0: 10, x1: 50, y1: 30 };
  const r2: Rect = { x0: 20, y0: 15, x1: 60, y1: 40 };
  const r3: Rect = { x0: 60, y0: 50, x1: 100, y1: 80 };

  assert.equal(rectsIntersect(r1, r2), true);
  assert.equal(rectsIntersect(r1, r3), false);
});

test('estimatePillDimensions returns reasonable dimensions for Chinese and mixed text', () => {
  const dim1 = estimatePillDimensions('1/2胸围', 10);
  assert.ok(dim1.width > 30);
  assert.ok(dim1.height >= 12);

  const dim2 = estimatePillDimensions('四针六线平缝', 11);
  assert.ok(dim2.width > dim1.width);
});

test('calculatePillPlacement places pill to the right or avoids forbidden boxes', () => {
  const block: TextBlock = {
    id: 'b1',
    text: '1/2 CHEST WIDTH',
    x0: 100,
    y0: 100,
    x1: 220,
    y1: 115,
    pageNumber: 1
  };

  // Space right is open (Priority 1: same line/cell right side)
  const placement1 = calculatePillPlacement(block, '1/2胸围', [], 600, 800, 10);
  assert.equal(placement1.placement, 'right');
  assert.ok(placement1.x >= 226);

  // Space right is blocked -> falls back to below
  const blockedRight: Rect = { x0: 221, y0: 95, x1: 300, y1: 125 };
  const placement2 = calculatePillPlacement(block, '1/2胸围', [blockedRight], 600, 800, 10);
  assert.equal(placement2.placement, 'below');
  assert.ok(placement2.y >= 115);

  // Space right and below are both blocked -> falls back to above
  const blockedBelow: Rect = { x0: 95, y0: 115, x1: 230, y1: 140 };
  const placement3 = calculatePillPlacement(block, '1/2胸围', [blockedRight, blockedBelow], 600, 800, 10);
  assert.equal(placement3.placement, 'above');
  assert.ok(placement3.y < 100);
});
