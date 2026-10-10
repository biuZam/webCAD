// The Tauri desktop shell (src-tauri). In a browser none of this runs and the Tauri modules are never loaded;
// in the desktop app native Save/Open dialogs replace the browser's download and file-picker fallbacks
// (WKWebView on macOS has neither the File System Access API nor <a download>).

export interface FileFilter {
  name: string
  extensions: string[]
}

/** True inside the Tauri desktop app. */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

const baseName = (path: string) => path.split(/[\\/]/).pop() ?? path

/** Ask where to save and write the file there. Returns the chosen path, or null if the user cancelled. */
export async function desktopSave(
  defaultName: string,
  filters: FileFilter[],
  data: string | Blob,
  defaultPath?: string,
): Promise<{ path: string; fileName: string } | null> {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const path = await save({ defaultPath: defaultPath ?? defaultName, filters })
  if (!path) return null
  await desktopWrite(path, data)
  return { path, fileName: baseName(path) }
}

/** Overwrite a file the user picked earlier in this session (picked paths stay in the fs scope until quit). */
export async function desktopWrite(path: string, data: string | Blob): Promise<void> {
  const { writeFile, writeTextFile } = await import('@tauri-apps/plugin-fs')
  if (typeof data === 'string') await writeTextFile(path, data)
  else await writeFile(path, new Uint8Array(await data.arrayBuffer()))
}

/** Ask for a text file and read it. Returns null if the user cancelled. */
export async function desktopOpenText(
  filters: FileFilter[],
): Promise<{ path: string; fileName: string; text: string } | null> {
  const [{ open }, { readTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ])
  const path = await open({ multiple: false, directory: false, filters })
  if (!path) return null
  return { path, fileName: baseName(path), text: await readTextFile(path) }
}
