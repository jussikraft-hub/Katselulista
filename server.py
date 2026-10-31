#!/usr/bin/env python3
"""
Katselulista – Local Development & LAN Server with QR-Code and Cloud/Obsidian Auto-Sync
"""
import os
import sys
import json
import socket
import subprocess
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8088
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_FILE = os.path.join(SCRIPT_DIR, "katselulista.json")
DROPBOX_DIR = os.path.expanduser("~/Library/CloudStorage/Dropbox-Personal/Kraft")
OBSIDIAN_DIR = os.path.expanduser("~/Library/Mobile Documents/iCloud~md~obsidian/Documents/JussiKraft/04 - Elämä & Luova")

def get_wifi_ip():
    """Detect macOS Wi-Fi IP address (en0 / en1)"""
    for interface in ["en0", "en1"]:
        try:
            res = subprocess.run(["ipconfig", "getifaddr", interface], capture_output=True, text=True, check=True)
            ip = res.stdout.strip()
            if ip:
                return ip
        except Exception:
            pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def print_qr_banner(url):
    """Print ASCII banner and QR code for iPhone/iPad scanning"""
    print("\n" + "=" * 60)
    print("🎬 KATSELULISTA – MOBIILI- JA IPAD-PALVELIN KÄYNNISSÄ")
    print("=" * 60)
    print(f"\n📍 Paikallinen osoite (Mac):   http://localhost:{PORT}")
    print(f"📱 Lähiverkon osoite (iPhone): {url}")
    print("\n👉 Avaa iPhonella/iPadilla Safarissa ja valitse:")
    print("   Jaa (Share) ➔ 'Lisää Koti-valikkoon' (Add to Home Screen)")
    print("   ➔ Sovellus aukeaa koko ruudulla ilman selaimen palkkeja!")
    print("-" * 60)

    # Try printing QR code with qrencode if available
    try:
        res = subprocess.run(["qrencode", "-t", "ANSIUTF8", url], capture_output=True, text=True)
        if res.returncode == 0 and res.stdout:
            print("\n📷 SKANNAA IPHONEN KAMERALLA:\n")
            print(res.stdout)
    except Exception:
        pass
    print("Paina Ctrl+C sulkeaksesi palvelimen.\n" + "=" * 60 + "\n")

class KatselulistaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SCRIPT_DIR, **kwargs)

    def do_GET(self):
        if self.path == "/api/sync":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            if os.path.exists(JSON_FILE):
                with open(JSON_FILE, "r", encoding="utf-8") as f:
                    self.wfile.write(f.read().encode("utf-8"))
            else:
                self.wfile.write(b"[]")
            return
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/sync":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body)
                # 1. Save locally
                with open(JSON_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                # 2. Save to Dropbox if exists
                if os.path.exists(DROPBOX_DIR):
                    dropbox_file = os.path.join(DROPBOX_DIR, "katselulista.json")
                    with open(dropbox_file, "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)

                # 3. Sync to Obsidian markdown if exists
                if os.path.exists(OBSIDIAN_DIR):
                    obsidian_file = os.path.join(OBSIDIAN_DIR, "Katselulista.md")
                    self.update_obsidian_markdown(data, obsidian_file)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "count": len(data)}).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return
        self.send_response(404)
        self.end_headers()

    def update_obsidian_markdown(self, items, filepath):
        """Update Obsidian Katselulista.md file automatically"""
        try:
            today = "2026-10-31"
            lines = [
                "---",
                "name: Katselulista",
                "tags:",
                "  - katselulista",
                "  - leffat",
                "  - sarjat",
                f"updated: {today}",
                "---",
                "",
                "# 🎬 Katselulista – Leffat & Sarjat",
                "",
                "> Tälle sivulle kootaan katselusuositukset, kiinnostavat uutuudet ja leffat/sarjat, joita tekee mieli katsoa rauhassa.",
                "",
                "---",
                "",
                "## ⏳ 1. Kesken / Meneillään",
                ""
            ]
            for i in [x for x in items if x.get("status") == "watching"]:
                lines.append(f"### 📺 {i.get('title')}")
                lines.append(f"- **Alusta:** {i.get('platform')}")
                if i.get("progress"):
                    lines.append(f"- **Tilanne:** {i.get('progress')}")
                if i.get("genres"):
                    lines.append(f"- **Genre:** {', '.join(i.get('genres', []))}")
                if i.get("cast"):
                    lines.append(f"- **Pääosissa:** {i.get('cast')}")
                if i.get("notes"):
                    lines.append(f"- **Muistiinpanot:** {i.get('notes')}")
                lines.append("")

            lines.extend(["---", "", "## 🍿 2. Katselulistalla (Seuraavaksi)", ""])
            for i in [x for x in items if x.get("status") == "watchlist"]:
                lines.append(f"### 📺 {i.get('title')}")
                lines.append(f"- **Alusta:** {i.get('platform')}")
                if i.get("genres"):
                    lines.append(f"- **Genre:** {', '.join(i.get('genres', []))}")
                if i.get("cast"):
                    lines.append(f"- **Pääosissa:** {i.get('cast')}")
                if i.get("synopsis"):
                    lines.append(f"- **Kuvaus:** {i.get('synopsis')}")
                if i.get("link"):
                    lines.append(f"- **Linkki:** {i.get('link')}")
                lines.append("")

            lines.extend(["---", "", "## ✅ 3. Katsotut & Arviot", ""])
            for i in [x for x in items if x.get("status") == "completed"]:
                lines.append(f"### 📺 {i.get('title')}")
                lines.append(f"- **Alusta:** {i.get('platform')}")
                if i.get("rating"):
                    lines.append(f"- **Arvio:** {'★' * int(i.get('rating'))}")
                if i.get("notes"):
                    lines.append(f"- **Kommentti:** {i.get('notes')}")
                lines.append("")

            with open(filepath, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))
        except Exception as e:
            print("Error updating Obsidian markdown:", e)

def main():
    if "--test" in sys.argv:
        print("Server test mode: OK")
        return 0

    ip = get_wifi_ip()
    url = f"http://{ip}:{PORT}"
    print_qr_banner(url)

    server = HTTPServer(("0.0.0.0", PORT), KatselulistaHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nPalvelin sammutettu.")
        server.server_close()

if __name__ == "__main__":
    main()
