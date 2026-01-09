# Documentation Translations

This folder contains translation files **exclusively for GitHub Pages documentation**.

## Important Notes

- **Independent from source code**: These translations are completely separate from `src/locales/`
- **Docs only**: Used only by `docs/js/i18n.js` for GitHub Pages
- **No dependency**: Does not affect or depend on bot source code translations

## Files

- `en.json` - English translations for documentation pages
- `vi.json` - Vietnamese translations for documentation pages

## Usage

These files are loaded by `docs/js/i18n.js` which:
- Loads translations from `docs/i18n/` folder only
- Never references `src/locales/`
- Works independently for static HTML pages

## Structure

Translation keys follow this structure:
```json
{
  "nav": {
    "home": "Home",
    "guide": "Guide",
    ...
  },
  "common": {
    "footer": "...",
    ...
  },
  "home": {
    "title": "...",
    ...
  }
}
```

## Adding New Translations

1. Add the key to both `en.json` and `vi.json`
2. Ensure both files have the same structure
3. Use the key in HTML with `data-i18n="namespace.key"`

