mod fs_ops;
mod pty;
mod settings;
mod wsl;

use pty::SessionManager;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

struct AppState {
    sessions: Mutex<SessionManager>,
}

#[tauri::command]
fn wsl_list() -> wsl::WslStatus {
    wsl::list_distributions()
}

#[tauri::command]
fn wsl_version() -> Result<String, String> {
    wsl::get_version_info().map_err(|e| e.to_string())
}

#[tauri::command]
fn wsl_home(distro: String) -> Result<String, String> {
    wsl::home_dir(&distro).map_err(|e| e.to_string())
}

#[tauri::command]
fn wsl_diagnostic(distro: String, command: Vec<String>) -> Result<String, String> {
    let refs: Vec<&str> = command.iter().map(|s| s.as_str()).collect();
    wsl::run_diagnostic(&distro, &refs).map_err(|e| e.to_string())
}

#[tauri::command]
fn pty_create(
    app: AppHandle,
    state: State<'_, AppState>,
    distro: String,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let manager = state.sessions.lock().unwrap();
    manager
        .create(app, &distro, cwd.as_deref(), cols, rows)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn pty_write(state: State<'_, AppState>, id: String, data: String) -> Result<(), String> {
    let manager = state.sessions.lock().unwrap();
    manager.write(&id, &data).map_err(|e| e.to_string())
}

#[tauri::command]
fn pty_resize(state: State<'_, AppState>, id: String, cols: u16, rows: u16) -> Result<(), String> {
    let manager = state.sessions.lock().unwrap();
    manager.resize(&id, cols, rows).map_err(|e| e.to_string())
}

#[tauri::command]
fn pty_kill(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let manager = state.sessions.lock().unwrap();
    manager.kill(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn pty_list(state: State<'_, AppState>) -> Vec<serde_json::Value> {
    let manager = state.sessions.lock().unwrap();
    manager.list()
}

#[tauri::command]
fn pty_count(state: State<'_, AppState>) -> usize {
    let manager = state.sessions.lock().unwrap();
    manager.count()
}

#[tauri::command]
fn fs_list(root: String, path: String, show_hidden: bool) -> Result<Vec<fs_ops::FsEntry>, String> {
    fs_ops::list_dir(&root, &path, show_hidden).map_err(|e| e.to_string())
}

#[tauri::command]
fn fs_mkdir(root: String, path: String) -> Result<(), String> {
    fs_ops::create_dir(&root, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn fs_touch(root: String, path: String) -> Result<(), String> {
    fs_ops::create_file(&root, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn fs_rename(root: String, path: String, new_name: String) -> Result<String, String> {
    fs_ops::rename_entry(&root, &path, &new_name).map_err(|e| e.to_string())
}

#[tauri::command]
fn fs_delete(root: String, path: String) -> Result<(), String> {
    fs_ops::delete_entry(&root, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn settings_load(app: AppHandle) -> settings::AppSettings {
    let dir = app.path().app_config_dir().unwrap_or_default();
    settings::load_settings(&dir)
}

#[tauri::command]
fn settings_save(app: AppHandle, value: settings::AppSettings) -> Result<(), String> {
    let dir = app.path().app_config_dir().unwrap_or_default();
    settings::save_settings(&dir, &value).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(AppState {
            sessions: Mutex::new(SessionManager::new()),
        })
        .invoke_handler(tauri::generate_handler![
            wsl_list,
            wsl_version,
            wsl_home,
            wsl_diagnostic,
            pty_create,
            pty_write,
            pty_resize,
            pty_kill,
            pty_list,
            pty_count,
            fs_list,
            fs_mkdir,
            fs_touch,
            fs_rename,
            fs_delete,
            settings_load,
            settings_save
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.app_handle().try_state::<AppState>() {
                    if let Ok(manager) = state.sessions.lock() {
                        manager.kill_all();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running RAYDEV");
}
