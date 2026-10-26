import { parseDecimal, parseVat, calculate, calculateFromTotal, formatMoneyInput, formatMoney, readSettings, formatAmountInput, splitTotal } from './calculator.js';
import { translations } from './translations.js';

const $ = id => document.getElementById(id);
let storage;
try { storage = window.localStorage; } catch { storage = undefined; }
const loaded = readSettings(storage);
const settings = { language: loaded.language, vat: loaded.vat, split: loaded.split };
let storageAvailable = loaded.available;
let result = null;
let amountSource = 'property';
let offlineKey = 'offlinePreparing';
const t = key => translations[settings.language][key];
const rateText = value => new Intl.NumberFormat({ EE: 'et-EE', EN: 'en-GB', RU: 'ru-RU' }[settings.language], { maximumFractionDigits: 2 }).format(Number(value.replace(',', '.')));

function saveSettings() {
  try {
    storage.setItem('vahendustasu.settings', JSON.stringify(settings));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  renderStorage();
}

function renderStorage() {
  $('storage-warning').hidden = storageAvailable;
  $('storage-warning').textContent = t('storageFailed');
}

function renderResult() {
  const source = $(amountSource);
  const amount = parseDecimal(source.value);
  for (const id of ['property', 'total']) {
    const invalid = id === amountSource && amount.state === 'invalid';
    $(id).setAttribute('aria-invalid', String(invalid));
    $(`${id}-error`).hidden = !invalid;
    $(`${id}-error`).textContent = t('invalidProperty');
  }
  const rate = rateText(settings.vat);
  $('vat-detail').textContent = `${settings.language === 'EE' ? 'KM' : t('vat')} ${rate}%`;
  $('vat-label').textContent = `${t('vat')} (${rate}%)`;
  const includeVat = $('include-vat').checked;
  $('vat-row').hidden = !includeVat;
  $('tax-status').textContent = t(includeVat ? 'includingVat' : 'excludingVat');
  result = amount.state === 'valid'
    ? (amountSource === 'total' ? calculateFromTotal : calculate)(amount.hundredths, $('commission').value, parseVat(settings.vat).hundredths, includeVat)
    : null;
  const target = $(amountSource === 'total' ? 'property' : 'total');
  target.value = result ? formatMoneyInput(amountSource === 'total' ? result.property : result.total, settings.language) : '';
  const percentage = parseVat(settings.split).hundredths;
  $('split-label').textContent = `${rateText(settings.split)}%`;
  $('remaining-label').textContent = `${rateText(String(Number(10000n - percentage) / 100))}%`;
  if (result) {
    const shares = splitTotal(result.total, percentage);
    $('split-result').textContent = formatMoney(shares.first, settings.language);
    $('remaining-result').textContent = formatMoney(shares.remaining, settings.language);
    $('base-result').textContent = formatMoney(result.commission, settings.language);
    $('vat-result').textContent = formatMoney(result.vat, settings.language);
  } else {
    $('split-result').textContent = '—';
    $('remaining-result').textContent = '—';
    $('base-result').textContent = '—';
    $('vat-result').textContent = '—';
  }
}

function validateSplit() {
  const parsed = parseVat($('split-rate').value);
  const invalid = parsed.state !== 'valid';
  $('split-rate').setAttribute('aria-invalid', String(invalid));
  $('split-error').hidden = !invalid;
  $('split-error').textContent = t('invalidVat');
  return parsed;
}

function validateVat() {
  const parsed = parseVat($('vat-rate').value);
  const invalid = parsed.state !== 'valid';
  $('vat-rate').setAttribute('aria-invalid', String(invalid));
  $('vat-error').hidden = !invalid;
  $('vat-error').textContent = t('invalidVat');
  return parsed;
}

function renderLanguage() {
  document.documentElement.lang = { EE: 'et', EN: 'en', RU: 'ru' }[settings.language];
  document.title = `${t('title')} · ${t('subtitle')}`;
  document.querySelector('meta[name=description]').content = t('intro');
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria]').forEach(element => { element.setAttribute('aria-label', t(element.dataset.i18nAria)); });
  for (const option of $('commission').options) option.textContent = `${rateText(String(Number(option.value) / 100))}%`;
  $('language').value = settings.language;
  $('offline-status').textContent = t(offlineKey);
  renderStorage();
  renderResult();
  if ($('settings-dialog').open) { validateVat(); validateSplit(); }
}

for (const id of ['property', 'total', 'commission', 'include-vat']) {
  $(id).addEventListener('input', () => {
    if (id === 'property' || id === 'total') {
      amountSource = id;
      const field = $(id);
      const position = field.selectionStart;
      const charactersBefore = field.value.slice(0, position).replace(/[ \u00a0\u202f]/g, '').length;
      const formatted = formatAmountInput(field.value);
      if (formatted !== field.value) {
        field.value = formatted;
        let cursor = 0;
        let characters = 0;
        while (cursor < formatted.length && characters < charactersBefore) {
          if (!/[ \u00a0\u202f]/.test(formatted[cursor])) characters++;
          cursor++;
        }
        field.setSelectionRange(cursor, cursor);
      }
    }
    renderResult();
  });
}
$('open-settings').addEventListener('click', () => {
  $('split-rate').value = rateText(settings.split);
  $('split-rate').removeAttribute('aria-invalid');
  $('split-error').hidden = true;
  $('vat-rate').value = rateText(settings.vat);
  $('vat-rate').removeAttribute('aria-invalid');
  $('vat-error').hidden = true;
  $('settings-dialog').showModal();
});
$('language').addEventListener('change', () => {
  settings.language = $('language').value;
  saveSettings();
  renderLanguage();
});
$('vat-rate').addEventListener('input', () => {
  const parsed = validateVat();
  if (parsed.state === 'valid') {
    settings.vat = String(Number(parsed.hundredths) / 100);
    saveSettings();
    renderResult();
  }
});
$('split-rate').addEventListener('input', () => {
  const parsed = validateSplit();
  if (parsed.state === 'valid') {
    settings.split = String(Number(parsed.hundredths) / 100);
    saveSettings();
    renderResult();
  }
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}
let installPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
window.addEventListener('appinstalled', () => { installPrompt = undefined; $('open-install').hidden = true; });
$('open-install').addEventListener('click', async () => {
  if (installPrompt) {
    const prompt = installPrompt;
    installPrompt = undefined;
    await prompt.prompt();
    await prompt.userChoice;
  } else {
    $('install-dialog').showModal();
  }
});
if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) $('open-install').hidden = true;
function setOfflineStatus(key) {
  offlineKey = key;
  $('offline-status').textContent = t(key);
  $('offline-dot').classList.toggle('ready', key === 'offlineReady');
}
async function registerOffline() {
  if (!('serviceWorker' in navigator)) { setOfflineStatus('offlineFailed'); return; }
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    await navigator.serviceWorker.ready;
    setOfflineStatus('offlineReady');
    if (registration.waiting) setOfflineStatus('updated');
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) setOfflineStatus('updated');
      });
    });
  } catch { setOfflineStatus('offlineFailed'); }
}
$('property').value = '';
$('total').value = '';
$('commission').value = '200';
$('include-vat').checked = false;
$('vat-rate').value = rateText(settings.vat);
renderLanguage();
registerOffline();
