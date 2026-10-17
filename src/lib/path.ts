export function basename(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

export function dirname(p: string): string {
  const isUnc = p.startsWith("\\\\");
  const isDrive = /^[A-Za-z]:/.test(p);
  const parts = p.split(/[\\/]/).filter(Boolean);
  parts.pop();
  if (isUnc) return "\\\\" + parts.join("\\");
  if (isDrive) return parts.join("\\") || p.slice(0, 3);
  // Unix-style absolute path
  return "/" + parts.join("/");
}

export function joinPath(base: string, child: string): string {
  if (child === "..") return dirname(base);
  const sep = base.includes("\\") && !base.includes("/") ? "\\" : "/";
  const trimmed = base.replace(/[\\/]+$/, "");
  return `${trimmed}${sep}${child}`;
}

/** Convert a Windows path under \\wsl.localhost\<distro>\ to a Linux path. */
export function windowsToLinuxPath(winPath: string): string | null {
  const m = winPath.match(/^\\\\wsl(?:\.localhost|\$)\\([^\\]+)\\(.*)$/i);
  if (!m) return null;
  let rest = m[2].replace(/\\/g, "/");
  if (/^[A-Za-z]:/.test(rest)) {
    // Drives mounted inside WSL, e.g. \\wsl.localhost\Ubuntu\mnt\c\...
    rest = "/" + rest;
  }
  if (!rest.startsWith("/")) rest = "/" + rest;
  return rest.replace(/\/+$/, "") || "/";
}
