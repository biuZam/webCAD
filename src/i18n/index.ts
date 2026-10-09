// i18n setup. `en` is bundled; other locales are separate chunks loaded on demand.
// See docs/ARCHITECTURE.md §9.

import i18next from 'i18next'
import ICU from 'i18next-icu'
import { initReactI18next } from 'react-i18next'
import common from '../locales/en/common.json'
import errors from '../locales/en/errors.json'
import exportNs from '../locales/en/export.json'
import tools from '../locales/en/tools.json'

export const NAMESPACES = ['common', 'tools', 'export', 'errors'] as const
export const SUPPORTED_LANGUAGES = ['en', 'zh-CN'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const enResources = { common, tools, export: exportNs, errors }

const STORAGE_KEY = 'leatherdraft.language'

// One lazy chunk per locale file; Vite resolves the glob at build time.
const localeLoaders = import.meta.glob<{ default: Record<string, unknown> }>([
  '../locales/*/*.json',
  '!../locales/en/*.json',
])

function readSavedLanguage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function detectLanguage(): Language {
  const saved = readSavedLanguage()
  if (saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) return saved as Language
  const browser = typeof navigator === 'undefined' ? 'en' : navigator.language
  return browser.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

async function loadLanguage(lng: Language) {
  if (lng === 'en' || i18next.hasResourceBundle(lng, 'common')) return
  await Promise.all(
    NAMESPACES.map(async (ns) => {
      const load = localeLoaders[`../locales/${lng}/${ns}.json`]
      if (load) i18next.addResourceBundle(lng, ns, (await load()).default, true, true)
    }),
  )
}

/** Switch language without reload and remember the choice. */
export async function setLanguage(lng: Language) {
  await loadLanguage(lng)
  await i18next.changeLanguage(lng)
  document.documentElement.lang = lng
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // Storage unavailable (private mode); the choice just isn't remembered.
  }
}

/**
 * Initialise synchronously with the bundled `en` resources so the app can render on the first frame.
 * Another detected language loads in the background and switches in when ready.
 */
export function initI18n() {
  const lng = detectLanguage()
  void i18next
    .use(ICU)
    .use(initReactI18next)
    .init({
      initAsync: false,
      resources: { en: enResources },
      lng: 'en',
      fallbackLng: 'en',
      ns: NAMESPACES,
      defaultNS: 'common',
      interpolation: { escapeValue: false },
      returnNull: false,
    })
  if (lng !== 'en') void setLanguage(lng)
  return i18next
}
