# 🖥️ Remote System Monitor & Control (Đồ án Mạng Máy Tính)

Hệ thống giám sát và điều khiển máy tính từ xa theo kiến trúc **Client-Server**. Ứng dụng cho phép quản trị viên theo dõi màn hình, webcam, hiệu năng hệ thống (CPU/RAM) và thực thi lệnh trên máy trạm thông qua giao diện Web thời gian thực.

![Project Status](https://img.shields.io/badge/Status-Completed-success)
![.NET](https://img.shields.io/badge/.NET-8.0-purple)
![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-Bundler-yellow)
![SignalR](https://img.shields.io/badge/SignalR-Realtime-red)

---

## 🚀 Tính năng chính

* 📷 **Webcam Streaming:** Xem trực tiếp hình ảnh từ Camera của máy trạm (Low latency & High FPS).
* ⌨️ **Keylogger:** Ghi lại thao tác bàn phím thời gian thực (Real-time Keystroke capturing).
* 📊 **System Monitor:** Theo dõi biểu đồ % CPU và lượng RAM tiêu thụ.
* ⚙️ **Process/Application Manager:** Xem danh sách tiến trình và buộc dừng (Kill) từ xa.
* 🔌 **Power Control:** Tắt máy (Shutdown) hoặc Khởi động lại (Restart) từ xa.
* 🔍 **Auto Discovery:** Tự động quét và tìm kiếm Server trong mạng LAN (không cần nhập IP).

---

## 🛠️ Yêu cầu hệ thống (Prerequisites)

Để chạy được dự án này, máy tính cần cài đặt:

1.  **Hệ điều hành:** Windows 10 hoặc Windows 11 (Bắt buộc cho phía Server).
2.  **.NET SDK 8.0 trở lên:** [Tải tại đây](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)
3.  **Node.js (LTS Version):** [Tải tại đây](https://nodejs.org/)

---

## 📥 Hướng dẫn Cài đặt (Installation)

Trước khi chạy lần đầu, bạn cần tải thư viện (chỉ cần làm 1 lần duy nhất khi mới tải về):

**1. Clone dự án về máy**
```bash
git clone [https://github.com/Khoi-Tu-2303/Computing_Network-Project_1.git](https://github.com/Khoi-Tu-2303/Computing_Network-Project_1.git)
cd Computing_Network-Project_1
```

**2. Cài đặt thư viện cho Server**
```bash
cd server_/server
dotnet restore
cd ../..
```

**3. Cài đặt thư viện cho Client**
```bash
cd client_/client
npm install
cd ../..
```

---

## ▶️ Hướng dẫn Chạy (Quick Start)

Dự án đã tích hợp sẵn các file kịch bản (`.bat`) để chạy nhanh. Bạn chỉ cần làm theo 2 bước:

### 1️⃣ Bước 1: Chạy Server
**⚠️ Lưu ý:** Server cần quyền truy cập hệ thống (Shutdown, Keylog...) nên **BẮT BUỘC** phải chạy dưới quyền Admin.

1.  Vào thư mục **`server_`**.
2.  Chuột phải vào file **`run_server.bat`** chọn **Run as Administrator**.
3.  Khi thấy cửa sổ hiện dòng chữ `Now listening on: http://localhost:5000` là thành công.

### 2️⃣ Bước 2: Chạy Client
File này sẽ tự động bật cả **IpAgent** (Tool hỗ trợ tìm IP) và **Web Client**.

1.  Vào thư mục **`client_`**.
2.  Double-click (nhấn đúp chuột trái) vào file **`run_client.bat`**.
3.  Trình duyệt sẽ tự động mở giao diện Web điều khiển.
4.  Nhấn nút **Scan Network** trên web để kết nối.

---

## 🐛 Khắc phục lỗi (Troubleshooting)

| Lỗi | Nguyên nhân & Cách sửa |
| :--- | :--- |
| **Server tự tắt ngay khi mở** | Bạn chưa chạy `run_server.bat` bằng quyền **Admin**. Chuột phải file -> *Run as Administrator*. |
| **Client không tìm thấy Server** | 1. Kiểm tra xem Server (cửa sổ đen) đã bật chưa.<br>2. Tắt Tường lửa (Firewall) hoặc cho phép port 5000.<br>3. Đảm bảo cả 2 máy chung Wifi/LAN. |
| **Lỗi 'npm' is not recognized** | Bạn chưa cài Node.js. Hãy cài đặt và khởi động lại máy. |
| **Lỗi 'dotnet' is not recognized** | Bạn chưa cài .NET SDK 8.0. Hãy tải và cài đặt lại. |

---

## 📬 Liên hệ
Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ qua:
- **Email:** 241220**@student.hcmus.edu.vn
- **GitHub:** https://github.com/Khoi-Tu-2303 (Đại diện 1 người)
