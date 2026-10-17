use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppSettings {
    pub theme: String,
    pub font_family: String,
    pub font_size: u32,
    pub line_height: f32,
    pub cursor_style: String,
    pub cursor_blink: bool,
    pub scrollback: u32,
    pub default_distro: Option<String>,
    pub default_project_dir: Option<String>,
    pub restore_last_session: bool,
    pub confirm_destructive: bool,
    pub monitoring_enabled: bool,
    pub monitoring_interval_ms: u64,
    pub show_hidden_files: bool,
    pub recent_projects: Vec<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".into(),
            font_family: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace".into(),
            font_size: 13,
            line_height: 1.4,
            cursor_style: "block".into(),
            cursor_blink: true,
            scrollback: 5000,
            default_distro: None,
            default_project_dir: None,
            restore_last_session: false,
            confirm_destructive: true,
            monitoring_enabled: false,
            monitoring_interval_ms: 5000,
            show_hidden_files: false,
            recent_projects: vec![],
        }
    }
}

pub fn settings_path(app_dir: &PathBuf) -> PathBuf {
    app_dir.join("settings.json")
}

pub fn load_settings(app_dir: &PathBuf) -> AppSettings {
    let path = settings_path(app_dir);
    match std::fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_default(),
        Err(_) => AppSettings::default(),
    }
}

pub fn save_settings(app_dir: &PathBuf, settings: &AppSettings) -> anyhow::Result<()> {
    let path = settings_path(app_dir);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(settings)?;
    std::fs::write(&path, json)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_are_sensible() {
        let s = AppSettings::default();
        assert_eq!(s.theme, "dark");
        assert_eq!(s.font_size, 13);
        assert!(s.confirm_destructive);
        assert!(!s.monitoring_enabled);
    }

    #[test]
    fn deserializes_missing_fields_with_defaults() {
        let s: AppSettings = serde_json::from_str(r#"{"theme":"light"}"#).unwrap();
        assert_eq!(s.theme, "light");
        assert_eq!(s.font_size, 13);
    }
}
