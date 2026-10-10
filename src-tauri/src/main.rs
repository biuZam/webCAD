// LeatherDraft desktop shell: a native window around the same Vite build as the web app (see ../dist).
// Native Open/Save and export dialogs go through the dialog + fs plugins (src/lib/desktop.ts on the JS side);
// everything else (drawing, autosave in IndexedDB, PDF generation) runs in the webview exactly as in a browser.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running LeatherDraft");
}
