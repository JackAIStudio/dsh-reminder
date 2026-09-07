import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { platform as osPlatform } from "node:os";
export function detectPlatform() {
    const p = osPlatform();
    if (p === "darwin")
        return "mac";
    if (p === "win32")
        return "win";
    if (p === "linux") {
        try {
            const version = readFileSync("/proc/version", "utf8");
            if (/microsoft/i.test(version))
                return "wsl";
        }
        catch { }
        return "linux";
    }
    return "unknown";
}
let cachedLinuxPlayer;
export function detectLinuxPlayer() {
    if (cachedLinuxPlayer !== undefined)
        return cachedLinuxPlayer;
    for (const cmd of ["pw-play", "paplay", "ffplay", "mpv", "play", "aplay"]) {
        try {
            execSync(`command -v ${cmd}`, { stdio: "pipe" });
            cachedLinuxPlayer = cmd;
            return cmd;
        }
        catch { }
    }
    cachedLinuxPlayer = null;
    return null;
}
// Fork addition: on Windows/WSL, prefer Windows PowerShell 5.1 (`powershell`)
// if installed — it spawns in ~0.5s vs ~1s for PowerShell 7 (`pwsh`) —
// falling back to pwsh. Returns the binary name suitable for `spawn()`.
let cachedPwshBin;
export function detectPwshBin() {
    if (cachedPwshBin !== undefined)
        return cachedPwshBin;
    // `powershell.exe` (5.1) is always present on Windows and starts faster;
    // `pwsh` (7) is optional. The bare names resolve via `where` (PATHEXT) on
    // native Windows; WSL bash needs the explicit `.exe` suffix.
    for (const bin of ["powershell", "powershell.exe", "pwsh", "pwsh.exe"]) {
        try {
            // `command -v` works in git-bash / WSL; on native Windows we use `where`.
            const checker = process.platform === "win32" ? `where ${bin}` : `command -v ${bin}`;
            execSync(checker, { stdio: "pipe" });
            cachedPwshBin = bin;
            return bin;
        }
        catch { }
    }
    cachedPwshBin = null;
    return null;
}
// Fork addition: detect a CLI audio player on Windows that supports volume
// control. Priority: ffplay > mpv. Returns null if neither is installed,
// in which case callers fall back to winmm.dll PlaySound (no volume control,
// but works without external dependencies).
let cachedWinPlayer;
export function detectWindowsPlayer() {
    if (cachedWinPlayer !== undefined)
        return cachedWinPlayer;
    for (const cmd of ["ffplay", "mpv"]) {
        try {
            const checker = process.platform === "win32" ? `where ${cmd}` : `command -v ${cmd}`;
            execSync(checker, { stdio: "pipe" });
            cachedWinPlayer = cmd;
            return cmd;
        }
        catch { }
    }
    cachedWinPlayer = null;
    return null;
}
/**
 * Convert a WSL path to the Windows path a spawned PowerShell can open.
 * WSL2 files live under `\\wsl.localhost\<distro>\...` from Windows' side and
 * `/mnt/<drive>/...` maps to `<drive>:\...`; passing a raw `/home/...` path
 * to Windows-side APIs (`System.Windows.Media.MediaPlayer`, WinRT Toast icon
 * bindings, ...) fails SILENTLY (no exception, no sound / no icon). The
 * distro name, user name, and drive mounts are resolved dynamically via
 * `wslpath -w` on every machine — nothing here is hardcoded. Falls back to
 * the raw path when `wslpath` is unavailable (e.g. inside a container),
 * where Windows-side playback cannot work anyway.
 */
export function wslToWindowsPath(file) {
    try {
        const quoted = `'${file.replace(/'/g, `'\\''`)}'`;
        const out = execSync(`wslpath -w ${quoted}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
        if (out.length > 0)
            return out;
    }
    catch { }
    return file;
}
//# sourceMappingURL=platform.js.map