use serde::Serialize;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WslDistro {
    pub name: String,
    pub state: String,
    pub version: u32,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WslStatus {
    pub installed: bool,
    pub default_distro: Option<String>,
    pub default_version: Option<u32>,
    pub distros: Vec<WslDistro>,
    pub error: Option<String>,
}

fn decode_wsl_output(bytes: &[u8]) -> String {
    // wsl.exe on Windows emits UTF-16LE (often with BOM)
    let mut u16s: Vec<u16> = Vec::with_capacity(bytes.len() / 2);
    let mut i = 0;
    while i + 1 < bytes.len() {
        u16s.push(u16::from_le_bytes([bytes[i], bytes[i + 1]]));
        i += 2;
    }
    if let Some(&first) = u16s.first() {
        if first == 0xFEFF {
            u16s.remove(0);
        }
    }
    String::from_utf16_lossy(&u16s)
        .replace('\0', "")
        .trim()
        .to_string()
}

fn run_wsl(args: &[&str]) -> anyhow::Result<(Vec<u8>, bool)> {
    let output = Command::new("wsl.exe")
        .args(args)
        .output()
        .map_err(|e| anyhow::anyhow!("Failed to execute wsl.exe: {e}"))?;
    Ok((output.stdout, output.status.success()))
}

pub fn get_status() -> WslStatus {
    match run_wsl(&["--status"]) {
        Ok((stdout, _)) => {
            let text = decode_wsl_output(&stdout);
            let mut default_distro = None;
            let mut default_version = None;
            for line in text.lines() {
                let line = line.trim();
                if let Some(rest) = line.strip_prefix("Default Distribution:") {
                    let d = rest.trim();
                    if !d.is_empty() {
                        default_distro = Some(d.to_string());
                    }
                } else if let Some(rest) = line.strip_prefix("Default Version:") {
                    default_version = rest.trim().parse().ok();
                }
            }
            // Older WSL: "Default Distribution: <name>"
            WslStatus {
                installed: true,
                default_distro,
                default_version,
                distros: vec![],
                error: None,
            }
        }
        Err(e) => WslStatus {
            installed: false,
            default_distro: None,
            default_version: None,
            distros: vec![],
            error: Some(format!(
                "wsl.exe is not available. Install WSL 2 with: wsl --install. Details: {e}"
            )),
        },
    }
}

pub fn list_distributions() -> WslStatus {
    let mut status = get_status();

    match run_wsl(&["-l", "-v"]) {
        Ok((stdout, ok)) => {
            let text = decode_wsl_output(&stdout);
            if !ok && text.trim().is_empty() {
                status.error = Some("wsl.exe -l -v returned no output. WSL may not be installed.".into());
                return status;
            }
            let mut distros = Vec::new();
            let mut header_skipped = false;
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                // Header line: "  NAME  STATE  VERSION"
                if !header_skipped {
                    let upper = trimmed.to_uppercase();
                    if upper.contains("NAME") && upper.contains("STATE") && upper.contains("VERSION") {
                        header_skipped = true;
                        continue;
                    }
                    header_skipped = true;
                }
                let is_default = trimmed.starts_with('*');
                let rest = if is_default { &trimmed[1..] } else { trimmed };
                let mut parts = rest.split_whitespace();
                let name = match parts.next() {
                    Some(n) => n.to_string(),
                    None => continue,
                };
                let state = parts.next().unwrap_or("Unknown").to_string();
                let version: u32 = parts.next().and_then(|v| v.parse().ok()).unwrap_or(0);
                if is_default && status.default_distro.is_none() {
                    status.default_distro = Some(name.clone());
                }
                if version > 0 && status.default_version.is_none() {
                    status.default_version = Some(version);
                }
                distros.push(WslDistro {
                    name,
                    state,
                    version,
                    is_default,
                });
            }
            status.distros = distros;
            status.installed = true;
        }
        Err(e) => {
            status.error = Some(format!("Failed to list distributions: {e}"));
        }
    }
    status
}

pub fn get_version_info() -> anyhow::Result<String> {
    let (stdout, _) = run_wsl(&["--version"])?;
    Ok(decode_wsl_output(&stdout))
}

pub fn home_dir(distro: &str) -> anyhow::Result<String> {
    let distro_arg = distro.to_string();
    let output = Command::new("wsl.exe")
        .args(["-d", &distro_arg, "--", "printenv", "HOME"])
        .output()
        .map_err(|e| anyhow::anyhow!("Failed to run wsl.exe: {e}"))?;
    let home = decode_wsl_output(&output.stdout);
    if home.is_empty() {
        anyhow::bail!("Could not resolve home directory in {distro}");
    }
    Ok(home.trim().to_string())
}

pub fn run_diagnostic(distro: &str, command: &[&str]) -> anyhow::Result<String> {
    let mut args: Vec<String> = vec!["-d".into(), distro.to_string(), "--".into()];
    args.extend(command.iter().map(|s| s.to_string()));
    let output = Command::new("wsl.exe")
        .args(&args)
        .output()
        .map_err(|e| anyhow::anyhow!("Failed to run wsl.exe: {e}"))?;
    let text = decode_wsl_output(&output.stdout);
    let err_text = decode_wsl_output(&output.stderr);
    if text.trim().is_empty() && !err_text.trim().is_empty() {
        Ok(err_text.trim().to_string())
    } else {
        Ok(text.trim().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_utf16le_with_bom() {
        let text = "  NAME      STATE     VERSION\r\n* Ubuntu    Stopped   2\r\n";
        let mut bytes: Vec<u8> = vec![0xFF, 0xFE];
        for u in text.encode_utf16() {
            bytes.extend_from_slice(&u.to_le_bytes());
        }
        let decoded = decode_wsl_output(&bytes);
        assert!(decoded.contains("Ubuntu"));
        assert!(decoded.contains("Stopped"));
        assert!(decoded.contains("2"));
        assert!(!decoded.contains('\0'));
    }

    #[test]
    fn decodes_utf16le_without_bom() {
        let text = "docker-desktop  Running  2";
        let mut bytes: Vec<u8> = Vec::new();
        for u in text.encode_utf16() {
            bytes.extend_from_slice(&u.to_le_bytes());
        }
        let decoded = decode_wsl_output(&bytes);
        assert_eq!(decoded, "docker-desktop  Running  2");
    }
}
