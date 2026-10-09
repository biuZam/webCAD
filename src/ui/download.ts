/** Save a generated file through the browser's normal download flow. */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: filename }).click()
  // Revoke after the click has been handled, not synchronously (some browsers cancel the download otherwise).
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
