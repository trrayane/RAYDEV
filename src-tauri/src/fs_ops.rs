use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
pub struct FsEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_hidden: bool,
}

fn is_hidden(path: &Path) -> bool {
    path.file_name()
        .and_then(|n| n.to_str())
        .map(|n| n.starts_with('.'))
        .unwrap_or(false)
}

/// Ensure `child` is contained within `root` after canonicalization.
pub fn validate_within(root: &Path, child: &Path) -> anyhow::Result<PathBuf> {
    let canon_root = root
        .canonicalize()
        .map_err(|e| anyhow::anyhow!("Cannot resolve root {}: {e}", root.display()))?;
    let canon_child = if child.exists() {
        child
            .canonicalize()
            .map_err(|e| anyhow::anyhow!("Cannot resolve path {}: {e}", child.display()))?
    } else {
        // For create operations: canonicalize the parent and append the filename
        let parent = child
            .parent()
            .ok_or_else(|| anyhow::anyhow!("Invalid path: {}", child.display()))?;
        let canon_parent = parent
            .canonicalize()
            .map_err(|e| anyhow::anyhow!("Cannot resolve parent {}: {e}", parent.display()))?;
        canon_parent.join(child.file_name().unwrap_or_default())
    };
    if !canon_child.starts_with(&canon_root) {
        anyhow::bail!(
            "Path {} escapes project root {}",
            child.display(),
            root.display()
        );
    }
    Ok(canon_child)
}

pub fn list_dir(root: &str, path: &str, show_hidden: bool) -> anyhow::Result<Vec<FsEntry>> {
    let root_path = PathBuf::from(root);
    let target = PathBuf::from(path);
    validate_within(&root_path, &target)?;
    let mut entries: Vec<FsEntry> = Vec::new();
    let rd = std::fs::read_dir(&target)
        .map_err(|e| anyhow::anyhow!("Cannot read {}: {e}", target.display()))?;
    for entry in rd {
        let entry = entry.map_err(|e| anyhow::anyhow!("Dir entry error: {e}"))?;
        let name = entry.file_name().to_string_lossy().to_string();
        let hidden = is_hidden(&entry.path());
        if hidden && !show_hidden {
            continue;
        }
        let is_dir = entry
            .file_type()
            .map(|t| t.is_dir())
            .unwrap_or(false);
        entries.push(FsEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir,
            is_hidden: hidden,
        });
    }
    entries.sort_by(|a, b| (!a.is_dir).cmp(&(!b.is_dir)).then(a.name.to_lowercase().cmp(&b.name.to_lowercase())));
    Ok(entries)
}

pub fn create_dir(root: &str, path: &str) -> anyhow::Result<()> {
    let root_path = PathBuf::from(root);
    let target = PathBuf::from(path);
    let target = validate_within(&root_path, &target)?;
    if target.exists() {
        anyhow::bail!("Already exists: {}", target.display());
    }
    std::fs::create_dir_all(&target)
        .map_err(|e| anyhow::anyhow!("Cannot create {}: {e}", target.display()))
}

pub fn create_file(root: &str, path: &str) -> anyhow::Result<()> {
    let root_path = PathBuf::from(root);
    let target = PathBuf::from(path);
    let target = validate_within(&root_path, &target)?;
    if target.exists() {
        anyhow::bail!("Already exists: {}", target.display());
    }
    std::fs::write(&target, "")
        .map_err(|e| anyhow::anyhow!("Cannot create {}: {e}", target.display()))
}

pub fn rename_entry(root: &str, path: &str, new_name: &str) -> anyhow::Result<String> {
    if new_name.contains('/') || new_name.contains('\\') || new_name.contains("..") {
        anyhow::bail!("Invalid name: {new_name}");
    }
    let root_path = PathBuf::from(root);
    let old = PathBuf::from(path);
    let old = validate_within(&root_path, &old)?;
    let new = old
        .parent()
        .ok_or_else(|| anyhow::anyhow!("Invalid path"))?
        .join(new_name);
    let new = validate_within(&root_path, &new)?;
    if new.exists() {
        anyhow::bail!("Name already in use: {new_name}");
    }
    std::fs::rename(&old, &new)
        .map_err(|e| anyhow::anyhow!("Rename failed: {e}"))?;
    Ok(new.to_string_lossy().to_string())
}

pub fn delete_entry(root: &str, path: &str) -> anyhow::Result<()> {
    let root_path = PathBuf::from(root);
    let target = PathBuf::from(path);
    let target = validate_within(&root_path, &target)?;
    // Refuse to delete the root itself
    let canon_root = root_path
        .canonicalize()
        .map_err(|e| anyhow::anyhow!("Cannot resolve root: {e}"))?;
    if target == canon_root {
        anyhow::bail!("Refusing to delete the project root");
    }
    if !target.exists() {
        anyhow::bail!("Not found: {}", target.display());
    }
    if target.is_dir() {
        std::fs::remove_dir_all(&target)
            .map_err(|e| anyhow::anyhow!("Cannot delete {}: {e}", target.display()))
    } else {
        std::fs::remove_file(&target)
            .map_err(|e| anyhow::anyhow!("Cannot delete {}: {e}", target.display()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_traversal_outside_root() {
        let root = std::env::temp_dir().join("raydev-test-root");
        std::fs::create_dir_all(&root).unwrap();
        let outside = std::env::temp_dir().join("raydev-outside");
        let result = validate_within(&root, &outside);
        assert!(result.is_err());
    }

    #[test]
    fn rejects_dotdot_escape() {
        let root = std::env::temp_dir().join("raydev-test-root2");
        std::fs::create_dir_all(&root).unwrap();
        let evil = root.join("..").join("elsewhere");
        let result = validate_within(&root, &evil);
        // canonicalize resolves .. so it should be caught OR parent resolution fails
        if let Ok(p) = result {
            assert!(p.starts_with(root.canonicalize().unwrap()));
        }
    }

    #[test]
    fn allows_inside_root() {
        let root = std::env::temp_dir().join("raydev-test-root3");
        std::fs::create_dir_all(root.join("subdir")).unwrap();
        let ok = root.join("subdir").join("file.txt");
        let result = validate_within(&root, &ok);
        assert!(result.is_ok());
    }
}
