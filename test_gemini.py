"""
test_gemini.py — smoke test for the Gemini LLM provider.

Reads GEMINI_API_KEY (and optional GEMINI_MODEL / GEMINI_BASE_URL) from .env
and sends a tiny prompt to the generateContent endpoint.

Run:  python test_gemini.py
"""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env"

DEFAULT_MODEL = "gemini-flash-latest"
DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def load_env(path: Path = ENV_FILE) -> dict:
    """Tiny .env parser (KEY=VALUE lines, supports quoted values)."""
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        env.setdefault(key.strip(), value)
    return env


def main() -> int:
    env = load_env()
    api_key = os.environ.get("GEMINI_API_KEY") or env.get("GEMINI_API_KEY")
    model = os.environ.get("GEMINI_MODEL") or env.get("GEMINI_MODEL") or DEFAULT_MODEL
    base_url = (
        os.environ.get("GEMINI_BASE_URL") or env.get("GEMINI_BASE_URL") or DEFAULT_BASE_URL
    )

    if not api_key:
        print("ERROR: GEMINI_API_KEY not found in environment or .env file.")
        return 1

    url = f"{base_url}/models/{model}:generateContent"
    payload = {
        "contents": [
            {"parts": [{"text": "Explain how AI works in a few words"}]}
        ]
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-goog-api-key": api_key},
        method="POST",
    )

    print(f"POST {url}")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        print(f"HTTP {exc.code}: {exc.read().decode('utf-8', 'replace')}")
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Request failed: {exc}")
        return 1

    try:
        text = body["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError):
        print("Unexpected response shape:")
        print(json.dumps(body, indent=2)[:2000])
        return 1

    print("OK — Gemini responded:")
    print(text.strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())