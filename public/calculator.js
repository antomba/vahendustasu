const spaces = /[ \u00a0\u202f]/;

export function parseDecimal(input, { grouped = true } = {}) {
  const value = input.trim();
  if (!value) return { state: 'empty' };
  const parts = value.split(/[.,]/);
  if (parts.length > 2 || (parts.length === 2 && !/^\d{1,2}$/.test(parts[1]))) return { state: 'invalid' };
  const integer = parts[0];
  const validInteger = /^\d+$/.test(integer) || (grouped && /^\d{1,3}(?:[ \u00a0\u202f]\d{3})+$/.test(integer));
  if (!validInteger || (!grouped && spaces.test(integer))) return { state: 'invalid' };
  const digits = integer.replace(/[ \u00a0\u202f]/g, '').replace(/^0+(?=\d)/, '');
  return { state: 'valid', hundredths: BigInt(digits) * 100n + BigInt((parts[1] || '').padEnd(2, '0')) };
}

export function formatAmountInput(input) {
  const compact = input.replace(/[ \u00a0\u202f]/g, '');
  if (!/^\d+(?:[.,]\d{0,2})?$/.test(compact)) return input;
  return compact.replace(/^\d+/, integer => integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
}

export function splitTotal(total, percentageHundredths) {
  const first = (total * BigInt(percentageHundredths) + 5000n) / 10000n;
  return { first, remaining: total - first };
}

export function parseVat(input) {
  const parsed = parseDecimal(input, { grouped: false });
  return parsed.state === 'valid' && parsed.hundredths <= 10000n ? parsed : { state: 'invalid' };
}

export function calculate(propertyCents, commissionHundredths, vatHundredths, includeVat) {
  const commission = (propertyCents * BigInt(commissionHundredths) + 5000n) / 10000n;
  const vat = includeVat ? (commission * BigInt(vatHundredths) + 5000n) / 10000n : 0n;
  return { commission, vat, total: commission + vat };
}

export function formatMoney(cents, language) {
  const locale = { EE: 'et-EE', EN: 'en-GB', RU: 'ru-RU' }[language] || 'et-EE';
  const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(cents / 100n);
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.1).find(part => part.type === 'decimal').value;
  return `${whole}${decimal}${String(cents % 100n).padStart(2, '0')} EUR`;
}

export function readSettings(storage) {
  const defaults = { language: 'EE', vat: '24', split: '40' };
  let raw;
  try {
    raw = storage.getItem('vahendustasu.settings');
  } catch {
    return { ...defaults, available: false };
  }
  try {
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return { ...defaults, available: true };
    return {
      language: ['EE', 'EN', 'RU'].includes(saved.language) ? saved.language : defaults.language,
      vat: typeof saved.vat === 'string' && parseVat(saved.vat).state === 'valid' ? saved.vat : defaults.vat,
      split: typeof saved.split === 'string' && parseVat(saved.split).state === 'valid' ? saved.split : defaults.split,
      available: true
    };
  } catch {
    return { ...defaults, available: true };
  }
}
