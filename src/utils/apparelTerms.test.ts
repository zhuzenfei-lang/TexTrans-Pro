import test from 'node:test';
import assert from 'node:assert/strict';
import { isPureMetricOrNumeric, lookupApparelTerm, GARMENT_ABBREVIATIONS } from './apparelTerms.ts';

test('isPureMetricOrNumeric correctly identifies pure measurements and units', () => {
  assert.equal(isPureMetricOrNumeric('5CM'), true);
  assert.equal(isPureMetricOrNumeric('12.5 cm'), true);
  assert.equal(isPureMetricOrNumeric('XS'), true);
  assert.equal(isPureMetricOrNumeric('2XL'), true);
  assert.equal(isPureMetricOrNumeric('+/- 0.5CM'), true);
  assert.equal(isPureMetricOrNumeric('1/2"'), true);
  assert.equal(isPureMetricOrNumeric('A'), true);
  assert.equal(isPureMetricOrNumeric('1.'), true);

  // Technical phrases should NOT be filtered out
  assert.equal(isPureMetricOrNumeric('1/2 CHEST WIDTH'), false);
  assert.equal(isPureMetricOrNumeric('CB LENGTH'), false);
  assert.equal(isPureMetricOrNumeric('REINFORCED BARTACK'), false);
  assert.equal(isPureMetricOrNumeric('100% COMBED COTTON'), false);
});

test('lookupApparelTerm accurately matches POM terms and apparel phrases', () => {
  assert.equal(lookupApparelTerm('1/2 CHEST WIDTH'), '1/2胸围');
  assert.equal(lookupApparelTerm('ACROSS SHOULDER'), '总肩宽/跨肩宽');
  assert.equal(lookupApparelTerm('FRENCH TERRY'), '毛圈布/卫衣布');
  assert.equal(lookupApparelTerm('4-THREAD OVERLOCK'), '四线包缝/拷边');
  assert.equal(lookupApparelTerm('YKK #5 VISLON ZIPPER'), 'YKK 5号树脂拉链');
});

test('GARMENT_ABBREVIATIONS provides essential industry definitions', () => {
  assert.ok(GARMENT_ABBREVIATIONS['HPS'].includes('High Point Shoulder'));
  assert.ok(GARMENT_ABBREVIATIONS['CB'].includes('Center Back'));
  assert.ok(GARMENT_ABBREVIATIONS['DTM'].includes('Dye To Match'));
});
