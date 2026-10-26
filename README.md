# Vahendustasu

A minimal real estate commission calculator in Estonian, English, and Russian. Frontend only, with exact decimal calculations, configurable VAT, editable totals and reverse property calculations, and offline PWA support. No dependencies or external requests are needed at runtime.

## Develop and verify

Use Node.js 22 or newer. No dependency installation is required.

```sh
npm run dev
npm test
npm run build
```

The development server opens at http://127.0.0.1:4173. The production build is the static `dist/` directory. Serve it over HTTPS or localhost for service workers. Opening `index.html` directly from the filesystem is not supported.

## GitHub Pages

1. In the repository's **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
2. Merge the reviewed changes into `main`. The included workflow runs tests, builds `dist/`, and deploys it to Pages. It can also be triggered manually from the Actions tab.
3. For this repository, the expected address is https://antomba.github.io/vahendustasu/. The workflow reports the actual deployment address.

All URLs are relative, so root domains and repository subpaths are supported. No SPA routing or server fallback is needed. This implementation does not commit or push changes automatically. Never commit or push to `master`.

## Behavior

- Defaults: Estonian, 24% VAT, 2% commission, VAT excluded, empty property value.
- Only language, commission split, and VAT rate are saved under `vahendustasu.settings` in local storage. Calculator inputs reset on reload; opening settings preserves them.
- Property values accept a comma or period decimal separator, up to two decimal places, and correctly grouped spaces between thousands. Mixed separators and ambiguous three-digit decimal fractions are rejected.
- Calculations use integer cents and hundredths of a percent. Commission and VAT each round half up to cents before addition.
- Edit either property value or total commission to calculate the other amount. The last edited amount stays fixed when changing commission or VAT rates.
- Entered totals include VAT when enabled. Reverse calculations divide the total by the VAT multiplier and commission rate, rounding property value and pre-VAT commission half up to cents, and preserve the entered total. At cent-level rounding boundaries, recalculating forward from the rounded property value can differ by a cent.
- Both amount fields accept the same decimal separators and grouped spaces. Clearing or invalidating the active amount clears the calculated amount and breakdown.
- Invalid VAT edits do not replace the last valid rate. Reopening settings restores the last valid rate.
- Unavailable local storage leaves the calculator usable and shows a notice.

## Offline use and updates

The first successful online load caches the complete application, translations, manifest, and icons. The footer confirms when offline preparation completes. Subsequent reloads work offline. Browser cache clearing or storage eviction requires another online load.

For each release that changes application assets, change the `CACHE` version in `public/sw.js`. The existing app continues to use its consistent cached version while the update installs. Close all tabs and installed windows for this application, then reopen it to activate the new version. Updates never delete local settings.

On iPhone/iPad, use Safari's Share menu → **Add to Home Screen**. Other supported browsers expose their own installation command; the app uses a native installation prompt when available and otherwise provides translated guidance.

## Manual browser acceptance checks

Verify current and previous major Safari versions on iOS/iPadOS/macOS and Chrome versions on Android/desktop before release:

- Enter the examples in the requirements; test every commission option and VAT off/on, including 0% and 100% rates.
- Paste grouped amounts and decimal fractions; check invalid values and a valid zero result.
- Enter a total with VAT off/on and verify the property value, breakdown, and split. Change rates, clear either amount, and switch calculation direction.
- Switch all languages, reload, and verify only settings persist. Block local storage and verify the warning and usable calculation.
- Open and close settings using pointer, keyboard, Escape, and screen reader; check labels, focus visibility, and confirmation announcements.
- Check 320px phones, iPhone and iPad portrait/landscape, desktop, and enlarged text for clipping or horizontal scrolling.
- Load over HTTPS, wait for the offline-ready status, disable networking, and reload. Test all languages and settings offline.
- Install and launch standalone where supported. Verify GitHub Pages subpath assets, cached updates, and offline relaunch.

Automated calculation and integration checks do not replace real-device Safari and installation checks.
