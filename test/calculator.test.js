import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDecimal, parseVat, calculate, formatMoney, readSettings } from '../public/calculator.js';
import { translations } from '../public/translations.js';

test('accepts decimal separators and properly grouped pasted amounts', () => {
  for (const input of ['200000', '200 000', '200\u00a0000', '200\u202f000', '200000,00', '200 000.00']) {
    assert.deepEqual(parseDecimal(input), { state: 'valid', hundredths: 20000000n });
  }
  assert.equal(parseDecimal('123,45').hundredths, 12345n);
  assert.equal(parseDecimal('0.1').hundredths, 10n);
  assert.equal(parseDecimal('0').hundredths, 0n);
  assert.equal(parseDecimal('  ').state, 'empty');
});

test('rejects invalid and ambiguous amounts', () => {
  for (const input of ['-1', '+1', '1,234', '1.234', '12 34', '1,000.00', '1.000,00', '100 00', '1e6', 'NaN', '12 EUR', '1.', '.5', '1.2.3']) {
    assert.equal(parseDecimal(input).state, 'invalid', input);
  }
});

test('calculates all acceptance examples with separate half-up rounding', () => {
  assert.deepEqual(calculate(10000000n, 200, 2400, false), { commission: 200000n, vat: 0n, total: 200000n });
  assert.deepEqual(calculate(10000000n, 200, 2400, true), { commission: 200000n, vat: 48000n, total: 248000n });
  assert.deepEqual(calculate(20000000n, 250, 2400, true), { commission: 500000n, vat: 120000n, total: 620000n });
  assert.deepEqual(calculate(12345n, 150, 2400, true), { commission: 185n, vat: 44n, total: 229n });
  assert.deepEqual(calculate(25n, 200, 10000, true), { commission: 1n, vat: 1n, total: 2n });
  assert.deepEqual(calculate(0n, 400, 2400, true), { commission: 0n, vat: 0n, total: 0n });
});

test('calculates every commission option and configurable VAT', () => {
  for (const rate of [100, 150, 200, 250, 300, 350, 400]) {
    const result = calculate(10000000n, rate, 2400, true);
    assert.equal(result.commission, BigInt(rate) * 1000n);
    assert.equal(result.vat, BigInt(rate) * 240n);
  }
  assert.equal(calculate(10000000n, 200, 2200, true).total, 244000n);
  assert.equal(calculate(10000000n, 200, 0, true).total, 200000n);
  assert.equal(calculate(10000000n, 200, 9950, false).total, 200000n);
});

test('validates VAT boundaries and fractional rates', () => {
  for (const input of ['0', '100', '24', '24,55', '0.01']) assert.equal(parseVat(input).state, 'valid');
  for (const input of ['', '-1', '100.01', '24.555', '1 00', 'abc']) assert.equal(parseVat(input).state, 'invalid');
});

test('formats localized exact monetary amounts including large integers', () => {
  assert.equal(formatMoney(248000n, 'EE'), '2480,00 EUR');
  assert.equal(formatMoney(248000n, 'EN'), '2,480.00 EUR');
  assert.equal(formatMoney(248000n, 'RU'), '2\u00a0480,00 EUR');
  assert.equal(formatMoney(0n, 'EE'), '0,00 EUR');
  assert.equal(formatMoney(1234567890123456789n, 'EN'), '12,345,678,901,234,567.89 EUR');
});

test('restores only valid settings and tolerates corrupt or blocked storage', () => {
  const storage = value => ({ getItem: () => value });
  assert.deepEqual(readSettings(storage(null)), { language: 'EE', vat: '24', available: true });
  assert.deepEqual(readSettings(storage('{broken')), { language: 'EE', vat: '24', available: true });
  assert.deepEqual(readSettings(storage('{"language":"RU","vat":"22.5","property":"200000"}')), { language: 'RU', vat: '22.5', available: true });
  assert.deepEqual(readSettings(storage('{"language":"FR","vat":"101"}')), { language: 'EE', vat: '24', available: true });
  assert.deepEqual(readSettings({ getItem() { throw new Error('blocked'); } }), { language: 'EE', vat: '24', available: false });
});

test('all languages provide every interface translation', () => {
  const keys = Object.keys(translations.EE).sort();
  for (const language of ['EE', 'EN', 'RU']) {
    assert.deepEqual(Object.keys(translations[language]).sort(), keys);
    for (const value of Object.values(translations[language])) assert.ok(typeof value === 'string' && value.length > 0);
  }
});
