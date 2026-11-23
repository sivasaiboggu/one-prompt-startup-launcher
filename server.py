#!/usr/bin/env python3
"""Optional local server for One-Prompt Startup Launcher.

Serves the app on http://localhost:8131 and stores waitlist signups in
data/waitlist.json (one list per launch slug) so everyone on the same
machine sees the same count. Pure standard library — no dependencies.

Usage:  python3 server.py        (then open http://localhost:8131)

Without this server the app works exactly the same from file:// or any
static host, storing signups in the browser's localStorage instead.
The app detects the server via GET /api/health.
"""
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
DATA_FILE = os.path.join(DATA_DIR, "waitlist.json")


def load():
    try:
        with open(DATA_FILE, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save(data):
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, DATA_FILE)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):  # keep the console quiet
        pass

    def _json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlparse(self.path).path == "/api/health":
            return self._json({"ok": True, "mode": "server"})
        if urlparse(self.path).path == "/api/waitlist":
            return self._json(load())
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/waitlist":
            return self._json({"error": "not found"}, 404)
        try:
            length = int(self.headers.get("Content-Length") or 0)
            payload = json.loads(self.rfile.read(length) or b"{}")
            slug = str(payload.get("slug") or "").strip()
            email = str(payload.get("email") or "").strip().lower()
        except (ValueError, TypeError):
            return self._json({"error": "bad json"}, 400)
        if not slug or "@" not in email or "." not in email.split("@")[-1]:
            return self._json({"error": "slug and a valid email are required"}, 400)
        data = load()
        entries = data.setdefault(slug, [])
        if any(e.get("email") == email for e in entries):
            return self._json({"ok": True, "duplicate": True, "count": len(entries)})
        from datetime import datetime, timezone
        entries.append({"email": email, "ts": datetime.now(timezone.utc).isoformat(), "source": "server"})
        save(data)
        return self._json({"ok": True, "count": len(entries)})


if __name__ == "__main__":
    print("One-Prompt Startup Launcher — http://localhost:8131")
    print("Waitlist file: data/waitlist.json (gitignored; never commit real emails)")
    ThreadingHTTPServer(("127.0.0.1", 8131), Handler).serve_forever()
