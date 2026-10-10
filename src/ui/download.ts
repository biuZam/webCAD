import { desktopSave, isDesktop } from '../lib/desktop'

/**
 * Save a generated file: the browser's normal download flow, or a native Save dialog in the desktop app.
 * Returns the saved file's name, or null if the user cancelled the dialog.
 */
export async function downloadBlob(filename: string, blob: Blob): Promise<string | null> {
  if (isDesktop()) {
    const ext = filename.slice(filename.lastIndexOf('.') + 1)
    const saved = await desktopSave(filename, [{ name: ext.toUpperCase(), extensions: [ext] }], blob)
    return saved?.fileName ?? null
  }
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: filename }).click()
  // Revoke after the click has been handled, not synchronously (some browsers cancel the download otherwise).
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return filename
}
