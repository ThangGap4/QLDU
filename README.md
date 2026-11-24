# BĐS Online — Nền tảng đăng tin và giao dịch bất động sản trực tuyến

- `backend/`: FastAPI + SQLAlchemy 2 + PostgreSQL (local tự dùng SQLite nếu không đặt `DATABASE_URL`)
- `frontend/`: React + Vite + react-router-dom

## Chạy local

Yêu cầu: Python 3.11+ , Node.js 20.19+.

```bash
# Backend (cổng 8000)
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python seed.py                       # tạo dữ liệu mẫu (chạy lại không bị trùng)
uvicorn app.main:app --reload --port 8000
# Tài liệu API: http://localhost:8000/docs

# Frontend (cổng 5173)
cd frontend
npm install
npm run dev                          # mặc định gọi API http://localhost:8000
```

Tài khoản demo (sau khi chạy `seed.py`):

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị | admin@bds.local | admin123 |
| Người bán | seller@bds.local | seller123 |
| Người mua | buyer@bds.local | buyer123 |

## Biến môi trường

Backend:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./dev.db` | Chuỗi kết nối Postgres (chấp nhận dạng `postgres://...` của Render/Neon) |
| `SECRET_KEY` | `dev-secret-key-change-me` | Khóa ký JWT — bắt buộc đổi khi deploy |
| `CORS_ORIGINS` | `*` | Danh sách domain frontend, phân tách bằng dấu phẩy |
| `ADMIN_EMAIL` | `admin@bds.local` | Tài khoản admin tạo tự động khi khởi động |
| `ADMIN_PASSWORD` | `admin123` | Mật khẩu admin |

Frontend:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | URL backend (không có `/` cuối) |

## Deploy

### Backend lên Render (free)

1. Push thư mục `web/` lên GitHub (thư mục gốc repo chứa `render.yaml`, `backend/`, `frontend/`).
2. Render → **New → Blueprint** → chọn repo. `render.yaml` tự tạo:
   - PostgreSQL free `bds-online-db` (hết hạn sau 30 ngày) và tự gán `DATABASE_URL` cho backend — không cần copy connection string.
   - Web service `bds-online-api`; `SECRET_KEY` tự sinh.
3. Render hỏi `ADMIN_PASSWORD` → nhập mật khẩu admin (khác `admin123`).
4. Mỗi lần khởi động, `seed.py` chạy trước: tạo bảng, admin và dữ liệu mẫu (đã có thì bỏ qua). Kiểm tra: `https://<backend>.onrender.com/api/health`.

### Frontend lên Vercel

1. Vercel → **Add New Project** → chọn repo → **Root Directory: `frontend`** (Framework: Vite).
2. Environment Variables: `VITE_API_URL=https://<backend>.onrender.com`.
3. Deploy. File `vercel.json` đã cấu hình rewrite để F5 ở mọi trang không bị 404.
4. Cập nhật lại `CORS_ORIGINS` trên Render bằng domain Vercel vừa có.

### Seed dữ liệu lên DB cloud

Khi deploy bằng Blueprint thì không cần bước này (seed tự chạy lúc khởi động). Chỉ dùng khi tự tạo DB ngoài (Neon/Supabase), chạy từ máy local:

```bash
cd backend
source .venv/bin/activate
DATABASE_URL="postgres://user:pass@host/db?sslmode=require" python seed.py
```

## Ghi chú

- Ảnh lưu trực tiếp trong Postgres (bảng `images`) vì ổ đĩa Render free bị xóa khi khởi động lại. Giới hạn: JPEG/PNG/WEBP, 5MB/ảnh, tối đa 5 ảnh/tin.
- Đặt cọc chỉ là mô phỏng, không có thanh toán thật.
- Render free sẽ "ngủ" sau 15 phút không dùng; lần gọi đầu tiên mất khoảng 30–60 giây.
