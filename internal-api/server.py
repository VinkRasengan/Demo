#!/usr/bin/env python3
"""Dịch vụ chỉ nội bộ — mô phỏng tài nguyên không thể gọi trực tiếp từ Internet."""
import http.server
import socketserver

PORT = 9000


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path.rstrip("/") == "/flag":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"message":"CVE-2023-27163 SSRF","internal_only":true}')
        else:
            self.send_error(404)


with socketserver.TCPServer(("0.0.0.0", PORT), H) as httpd:
    print("[internal-api] :9000", flush=True)
    httpd.serve_forever()
