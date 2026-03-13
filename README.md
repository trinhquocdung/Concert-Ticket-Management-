# Concert-Ticket-Management-
HƯỚNG DẪN CHẠY DỰ ÁN


Cấu trúc thư mục:
/backend : Mã nguồn máy chủ (API, Cơ sở dữ liệu)
/client  : Giao diện dành cho người dùng (Frontend)
/admin-dashboard   : Giao diện dành cho quản trị viên (Frontend Admin)

-----------------------------------------------------------
1. YÊU CẦU HỆ THỐNG (Prerequisites)
-----------------------------------------------------------
- Đã cài đặt Node.js (phiên bản v16 trở lên)
- Đã cài đặt Database MongoDB (api key có trong file .env)
- Trình duyệt web hiện đại (Chrome, Edge, Firefox)

-----------------------------------------------------------
2. CẤU HÌNH BACKEND
-----------------------------------------------------------
Bước 1: Truy cập vào thư mục backend(quickshow-ticket/backend)
   cd backend

Bước 2: Cài đặt thư viện
   npm install

Bước 3: Chạy server
   npm start  (hoặc node src/server.js)
   -> Server sẽ chạy tại: http://localhost:5000

-----------------------------------------------------------
3. CẤU HÌNH CLIENT (Người dùng)
-----------------------------------------------------------
Bước 1: Truy cập vào thư mục client
   cd client(quickshow-ticket/client)

Bước 2: Cài đặt thư viện
   npm install

Bước 3: Chạy ứng dụng
   npm start (hoặc npm run dev)
   -> Truy cập tại: http://localhost:5173

-----------------------------------------------------------
4. CẤU HÌNH ADMIN (Quản trị viên)
-----------------------------------------------------------
Bước 1: Truy cập vào thư mục admin
   cd admin(quickshow-ticket/admin)

Bước 2: Cài đặt thư viện
   npm install

Bước 3: Chạy ứng dụng
   npm start (hoặc npm run dev)
   -> Truy cập tại: http://localhost:5174

-----------------------------------------------------------
LƯU Ý QUAN TRỌNG:
- Tài khoản đăng nhập admin: admin@gmail.com/admin123
- Luôn khởi chạy Backend trước khi chạy Client và Admin để đảm bảo dữ liệu được kết nối.
- Đảm bảo các cổng (Port) trong file .env trùng khớp với cấu hình gọi API ở Frontend.
===========================================================
