use base64::Engine;
use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
pub struct PtyOutputEvent {
    pub id: String,
    pub data: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PtyExitEvent {
    pub id: String,
    pub code: Option<i32>,
}

pub struct Session {
    pub id: String,
    pub distro: String,
    pub cwd: String,
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    killer: Box<dyn ChildKiller + Send + Sync>,
    pub alive: Arc<AtomicBool>,
}

pub struct SessionManager {
    sessions: Mutex<HashMap<String, Session>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn list(&self) -> Vec<serde_json::Value> {
        let map = self.sessions.lock().unwrap();
        map.values()
            .map(|s| {
                serde_json::json!({
                    "id": s.id,
                    "distro": s.distro,
                    "cwd": s.cwd,
                    "alive": s.alive.load(Ordering::SeqCst),
                })
            })
            .collect()
    }

    pub fn create(
        &self,
        app: AppHandle,
        distro: &str,
        cwd: Option<&str>,
        cols: u16,
        rows: u16,
    ) -> anyhow::Result<String> {
        let id = Uuid::new_v4().to_string();
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| anyhow::anyhow!("PTY open failed: {e}"))?;

        let mut cmd = CommandBuilder::new("wsl.exe");
        cmd.arg("-d");
        cmd.arg(distro);
        if let Some(dir) = cwd {
            if !dir.is_empty() {
                cmd.arg("--cd");
                cmd.arg(dir);
            }
        }
        // Ensure a consistent interactive environment
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| anyhow::anyhow!("Failed to spawn wsl.exe: {e}"))?;

        // Keep master writer
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| anyhow::anyhow!("PTY writer failed: {e}"))?;

        let killer = child.clone_killer();
        let alive = Arc::new(AtomicBool::new(true));
        let alive_reader = alive.clone();
        let id_reader = id.clone();
        let app_reader = app.clone();

        // Reader thread: stream PTY output to frontend in base64 chunks
        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| anyhow::anyhow!("PTY reader clone failed: {e}"))?;
        std::thread::spawn(move || {
            let mut buf = [0u8; 8192];
            let mut pending: Vec<u8> = Vec::with_capacity(16384);
            let engine = base64::engine::general_purpose::STANDARD;
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        pending.extend_from_slice(&buf[..n]);
                        // Flush in chunks to batch events
                        if pending.len() >= 8192 {
                            let b64 = engine.encode(&pending);
                            let _ = app_reader.emit(
                                "raydev://pty-output",
                                PtyOutputEvent {
                                    id: id_reader.clone(),
                                    data: b64,
                                },
                            );
                            pending.clear();
                        }
                    }
                    Err(_) => break,
                }
            }
            // Flush remainder
            if !pending.is_empty() {
                let b64 = engine.encode(&pending);
                let _ = app_reader.emit(
                    "raydev://pty-output",
                    PtyOutputEvent {
                        id: id_reader.clone(),
                        data: b64,
                    },
                );
            }
            alive_reader.store(false, Ordering::SeqCst);
        });

        // Wait thread: reap exit status and notify frontend
        let alive_wait = alive.clone();
        let id_wait = id.clone();
        std::thread::spawn(move || {
            let mut child = child;
            let code = child.wait().ok().map(|status| status.exit_code() as i32);
            alive_wait.store(false, Ordering::SeqCst);
            let _ = app.emit(
                "raydev://pty-exit",
                PtyExitEvent {
                    id: id_wait,
                    code,
                },
            );
        });

        // Close slave on our side so EOF propagates when child exits
        drop(pair.slave);

        let mut map = self.sessions.lock().unwrap();
        map.insert(
            id.clone(),
            Session {
                id: id.clone(),
                distro: distro.to_string(),
                cwd: cwd.unwrap_or("~").to_string(),
                master: pair.master,
                writer,
                killer,
                alive,
            },
        );
        Ok(id)
    }

    pub fn write(&self, id: &str, data_b64: &str) -> anyhow::Result<()> {
        let engine = base64::engine::general_purpose::STANDARD;
        let data = engine
            .decode(data_b64)
            .map_err(|e| anyhow::anyhow!("Invalid base64 input: {e}"))?;
        let mut map = self.sessions.lock().unwrap();
        let session = map
            .get_mut(id)
            .ok_or_else(|| anyhow::anyhow!("Unknown session: {id}"))?;
        session
            .writer
            .write_all(&data)
            .map_err(|e| anyhow::anyhow!("PTY write failed: {e}"))?;
        session
            .writer
            .flush()
            .map_err(|e| anyhow::anyhow!("PTY flush failed: {e}"))?;
        Ok(())
    }

    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> anyhow::Result<()> {
        let map = self.sessions.lock().unwrap();
        let session = map
            .get(id)
            .ok_or_else(|| anyhow::anyhow!("Unknown session: {id}"))?;
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| anyhow::anyhow!("PTY resize failed: {e}"))?;
        Ok(())
    }

    pub fn kill(&self, id: &str) -> anyhow::Result<()> {
        let mut map = self.sessions.lock().unwrap();
        if let Some(mut session) = map.remove(id) {
            let _ = session.killer.kill();
            session.alive.store(false, Ordering::SeqCst);
            drop(session.writer);
            drop(session.master);
        }
        Ok(())
    }

    pub fn kill_all(&self) {
        let mut map = self.sessions.lock().unwrap();
        for (_, mut session) in map.drain() {
            let _ = session.killer.kill();
            session.alive.store(false, Ordering::SeqCst);
        }
    }

    pub fn count(&self) -> usize {
        let map = self.sessions.lock().unwrap();
        map.values()
            .filter(|s| s.alive.load(Ordering::SeqCst))
            .count()
    }
}
