/// <reference types="vite-plugin-pwa/client" />
// T3.7 Service worker registration (offline + installable). Updates wait for the user: a notice offers Reload.

import { registerSW } from 'virtual:pwa-register'
import { useUiStore } from '../canvas/ui-store'

let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null

/** Reload into the waiting new version (called from the "Update available" notice). */
export function reloadForUpdate() {
  void applyUpdate?.(true)
}

export function registerServiceWorker() {
  // Dev builds have no service worker (vite-plugin-pwa only generates one for production).
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
  applyUpdate = registerSW({
    onNeedRefresh() {
      useUiStore.getState().showNotice({ kind: 'update' })
    },
    onOfflineReady() {
      useUiStore.getState().showNotice({ kind: 'info', key: 'file.offlineReady' })
    },
  })
}
