"""Free API/UI ports, then start Nexus backend + frontend together.

Usage (from the repo root):
    python run.py
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
API_PORT = 8000
UI_PORT = 5173
IS_WIN = os.name == "nt"


def _pids_on_port(port: int) -> set[int]:
    pids: set[int] = set()
    if IS_WIN:
        completed = subprocess.run(
            ["netstat", "-ano", "-p", "tcp"],
            capture_output=True,
            text=True,
            check=False,
        )
        needle = f":{port}"
        for line in completed.stdout.splitlines():
            if needle not in line or "LISTENING" not in line.upper():
                continue
            parts = line.split()
            if len(parts) < 5:
                continue
            try:
                pid = int(parts[-1])
            except ValueError:
                continue
            if pid > 4:
                pids.add(pid)
        return pids

    completed = subprocess.run(
        ["lsof", "-ti", f"tcp:{port}", "-sTCP:LISTEN"],
        capture_output=True,
        text=True,
        check=False,
    )
    for token in completed.stdout.split():
        try:
            pid = int(token)
        except ValueError:
            continue
        if pid > 1:
            pids.add(pid)
    return pids


def kill_port(port: int) -> None:
    pids = _pids_on_port(port)
    if not pids:
        print(f"port {port}: free")
        return
    print(f"port {port}: stopping PIDs {sorted(pids)}")
    for pid in pids:
        if IS_WIN:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                capture_output=True,
                check=False,
            )
        else:
            try:
                os.kill(pid, signal.SIGTERM)
            except OSError:
                pass
    deadline = time.time() + 5
    while time.time() < deadline and _pids_on_port(port):
        time.sleep(0.2)
        leftover = _pids_on_port(port)
        if not leftover:
            break
        for pid in leftover:
            if IS_WIN:
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(pid)],
                    capture_output=True,
                    check=False,
                )
            else:
                try:
                    os.kill(pid, signal.SIGKILL)
                except OSError:
                    pass
    still = _pids_on_port(port)
    if still:
        raise SystemExit(f"port {port} still in use by {sorted(still)}")
    print(f"port {port}: free")


def _venv_python() -> Path:
    if IS_WIN:
        path = BACKEND / ".venv" / "Scripts" / "python.exe"
    else:
        path = BACKEND / ".venv" / "bin" / "python"
    if not path.exists():
        raise SystemExit(f"backend venv missing: {path}")
    return path


def _npm() -> str:
    return "npm.cmd" if IS_WIN else "npm"


def _popen(args: list[str], cwd: Path) -> subprocess.Popen:
    kwargs: dict = {
        "cwd": str(cwd),
        "env": os.environ.copy(),
    }
    if IS_WIN:
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    return subprocess.Popen(args, **kwargs)


def _stop(proc: subprocess.Popen | None) -> None:
    if proc is None or proc.poll() is not None:
        return
    if IS_WIN:
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
            capture_output=True,
            check=False,
        )
    else:
        try:
            os.killpg(proc.pid, signal.SIGTERM)
        except OSError:
            proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except OSError:
                proc.kill()


def main() -> int:
    if not (FRONTEND / "package.json").exists():
        raise SystemExit(f"frontend not found: {FRONTEND}")
    python = _venv_python()

    kill_port(API_PORT)
    kill_port(UI_PORT)

    backend = _popen(
        [
            str(python),
            "-m",
            "uvicorn",
            "app.main:app",
            "--reload",
            "--host",
            "127.0.0.1",
            "--port",
            str(API_PORT),
        ],
        BACKEND,
    )
    frontend = _popen([_npm(), "run", "dev"], FRONTEND)
    print(f"backend  http://127.0.0.1:{API_PORT}   (pid {backend.pid})")
    print(f"frontend  http://localhost:{UI_PORT}     (pid {frontend.pid})")
    print("Ctrl+C to stop both")

    code = 0
    try:
        while True:
            b = backend.poll()
            f = frontend.poll()
            if b is not None:
                code = b or 1
                print(f"backend exited ({b})")
                break
            if f is not None:
                code = f or 1
                print(f"frontend exited ({f})")
                break
            time.sleep(0.4)
    except KeyboardInterrupt:
        print("\nstopping…")
        code = 0
    finally:
        _stop(frontend)
        _stop(backend)
        kill_port(API_PORT)
        kill_port(UI_PORT)
    return code


if __name__ == "__main__":
    sys.exit(main())
