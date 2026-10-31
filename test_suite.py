#!/usr/bin/env python3
"""
Test Suite for Katselulista Web App & Server
"""
import os
import sys
import json
import subprocess
import unittest

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

class TestKatselulistaApp(unittest.TestCase):
    def test_01_json_validity(self):
        json_path = os.path.join(SCRIPT_DIR, "katselulista.json")
        self.assertTrue(os.path.exists(json_path), "katselulista.json missing")
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertIsInstance(data, list)
        for item in data:
            self.assertIn("id", item)
            self.assertIn("title", item)
            self.assertIn("status", item)
            self.assertIn("platform", item)
            self.assertIn(item["status"], ["watching", "watchlist", "completed"])

    def test_02_javascript_syntax(self):
        app_js = os.path.join(SCRIPT_DIR, "app.js")
        self.assertTrue(os.path.exists(app_js), "app.js missing")
        res = subprocess.run(["node", "-c", app_js], capture_output=True, text=True)
        self.assertEqual(res.returncode, 0, f"app.js syntax error: {res.stderr}")

    def test_03_html_structure(self):
        html_path = os.path.join(SCRIPT_DIR, "index.html")
        self.assertTrue(os.path.exists(html_path), "index.html missing")
        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()
        self.assertIn("apple-mobile-web-app-capable", html)
        self.assertIn("viewport-fit=cover", html)
        self.assertIn("manifest.json", html)
        self.assertIn('id="cardsGrid"', html)
        self.assertIn('id="detailModal"', html)
        self.assertIn('id="addModal"', html)
        self.assertIn('id="syncModal"', html)
        self.assertIn('src="app.js"', html)

    def test_04_css_structure(self):
        css_path = os.path.join(SCRIPT_DIR, "style.css")
        self.assertTrue(os.path.exists(css_path), "style.css missing")
        with open(css_path, "r", encoding="utf-8") as f:
            css = f.read()
        self.assertIn("--bg-main", css)
        self.assertIn(".cards-grid", css)
        self.assertIn(".modal-sheet", css)
        self.assertIn("safe-area-inset-top", css)

    def test_05_server_cli_test(self):
        server_py = os.path.join(SCRIPT_DIR, "server.py")
        res = subprocess.run([sys.executable, server_py, "--test"], capture_output=True, text=True)
        self.assertEqual(res.returncode, 0, f"server.py test failed: {res.stderr}")
        self.assertIn("OK", res.stdout)

if __name__ == "__main__":
    unittest.main()
