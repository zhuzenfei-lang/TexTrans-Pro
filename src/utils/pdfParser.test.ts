import test from 'node:test';
import assert from 'node:assert/strict';
import { clusterTextItems } from './textCluster.ts';
import type { RawTextItem } from './textCluster.ts';

test('clusterTextItems merges adjacent words on same baseline into single phrase', () => {
  const items: RawTextItem[] = [
    { str: '1/2', x: 50, y: 100, width: 20, height: 12 },
    { str: 'CHEST', x: 74, y: 100, width: 40, height: 12 },
    { str: 'WIDTH', x: 118, y: 100, width: 45, height: 12 },
    // Different line
    { str: 'TOLERANCE:', x: 50, y: 130, width: 70, height: 12 },
    { str: '+/- 0.5CM', x: 125, y: 130, width: 50, height: 12 }
  ];

  const blocks = clusterTextItems(items, 1);
  assert.equal(blocks.length, 2);

  // First block should be clustered
  assert.equal(blocks[0].text, '1/2 CHEST WIDTH');
  assert.equal(blocks[0].translation, '1/2胸围');
  assert.equal(blocks[0].category, 'pom');
  assert.equal(blocks[0].x0, 50);
  assert.equal(blocks[0].y0, 100);

  // Second block
  assert.equal(blocks[1].text, 'TOLERANCE: +/- 0.5CM');
  assert.equal(blocks[1].y0, 130);
});

test('clusterTextItems handles empty or whitespace-only items gracefully', () => {
  assert.deepEqual(clusterTextItems([]), []);
  assert.deepEqual(clusterTextItems([{ str: '   ', x: 0, y: 0, width: 0, height: 0 }]), []);
});
