// i18n system for GitHub Pages

let currentLocale = 'vi';
let translations = {};

// Get base path for translations
// NOTE: This i18n system is independent from src/locales
// It only loads from docs/i18n/ folder
function getBasePath() {
  const path = window.location.pathname;
  // If we're in a subdirectory (like /docs/), use that as base
  if (path.includes('/docs/')) {
    return '/docs/';
  }
  // Otherwise assume root (for GitHub Pages)
  return '/';
}

// Load translations from docs/i18n/ folder only
// This is completely independent from src/locales/
async function loadTranslations(locale) {
  try {
    const basePath = getBasePath();
    // Always load from docs/i18n/ - never from src/locales/
    const response = await fetch(`${basePath}i18n/${locale}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load translations for ${locale}`);
    }
    translations = await response.json();
    return translations;
  } catch (error) {
    console.error('Error loading translations:', error);
    // Fallback to Vietnamese if English fails
    if (locale === 'en') {
      return loadTranslations('vi');
    }
    return {};
  }
}

// Get translation by key (supports nested keys like "nav.home")
function t(key, params = {}) {
  const keys = key.split('.');
  let value = translations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }

  // If value is an array, return it as-is
  if (Array.isArray(value)) {
    return value;
  }

  // Replace parameters
  if (typeof value === 'string' && params) {
    Object.keys(params).forEach((param) => {
      value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
    });
  }

  return value || key;
}

// Apply translations to page
function applyTranslations() {
  // Translate elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    const translation = t(key);

    if (element.tagName === 'INPUT' && element.type === 'submit') {
      element.value = translation;
    } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.placeholder = translation;
    } else {
      element.textContent = translation;
    }
  });

  // Translate elements with data-i18n-html (for HTML content)
  document.querySelectorAll('[data-i18n-html]').forEach((element) => {
    const key = element.getAttribute('data-i18n-html');
    const translation = t(key);
    element.innerHTML = translation;
  });

  // Translate elements with data-i18n-attr (for attributes)
  document.querySelectorAll('[data-i18n-attr]').forEach((element) => {
    const attrData = element.getAttribute('data-i18n-attr');
    const [attr, key] = attrData.split(':');
    const translation = t(key);
    element.setAttribute(attr, translation);
  });

  // Update language switcher
  updateLanguageSwitcher();
}

// Update language switcher UI
function updateLanguageSwitcher() {
  const switcher = document.querySelector('.language-switcher');
  if (switcher) {
    const currentLang = switcher.querySelector(`[data-lang="${currentLocale}"]`);
    const otherLang = switcher.querySelector(`[data-lang]:not([data-lang="${currentLocale}"])`);

    if (currentLang) {
      currentLang.classList.add('active');
    }
    if (otherLang) {
      otherLang.classList.remove('active');
    }
  }
}

// Change language
async function changeLanguage(locale) {
  if (locale === currentLocale) return;

  currentLocale = locale;
  localStorage.setItem('preferredLanguage', locale);

  await loadTranslations(locale);
  applyTranslations();

  // Update URL without reload (optional)
  const url = new URL(window.location);
  url.searchParams.set('lang', locale);
  window.history.pushState({}, '', url);

  // Dispatch custom event for other scripts
  window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { locale } }));
}

// Initialize i18n
async function initI18n() {
  // Get preferred language from:
  // 1. URL parameter
  // 2. localStorage
  // 3. Browser language
  // 4. Default to 'vi'

  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');

  const storedLang = localStorage.getItem('preferredLanguage');

  const browserLang = navigator.language || navigator.userLanguage;
  const browserLangCode = browserLang.split('-')[0];

  let preferredLang = urlLang || storedLang || (browserLangCode === 'en' ? 'en' : 'vi');

  // Validate locale
  if (preferredLang !== 'vi' && preferredLang !== 'en') {
    preferredLang = 'vi';
  }

  currentLocale = preferredLang;

  await loadTranslations(currentLocale);
  applyTranslations();
}

// Export for use in other scripts
window.i18n = {
  t,
  changeLanguage,
  currentLocale: () => currentLocale,
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}
