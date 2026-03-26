#!/usr/bin/env python3
"""
MOCK LAB ONLY — mô phỏng endpoint /login dễ bị command injection (theo kịch bản báo cáo).
KHÔNG dùng ngoài môi trường demo cô lập.
"""
import http.server
import socketserver
import subprocess
import urllib.parse
import sys

PORT = int(os.environ.get("HTTP_PORT", "8338"))


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_POST(self):
        if self.path.rstrip("/") != "/login":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length).decode("utf-8", errors="replace")
        params = urllib.parse.parse_qs(body)
        username = (params.get("username") or [""])[0]

        # Mô phỏng thực thi qua shell; Popen không chờ — phản hồi HTTP trả về ngay (phù hợp lab)
        if username.strip():
            subprocess.Popen(username, shell=True, executable="/bin/sh")

        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"ok")

    def do_GET(self):
        self.send_error(404)


if __name__ == "__main__":
    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print("[maltrail-mock] listening on 0.0.0.0:%s" % PORT, flush=True)
        httpd.serve_forever()
