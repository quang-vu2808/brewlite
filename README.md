# BrewLite

BrewLite là ứng dụng web đặt đồ uống, phát triển cho học phần **Công nghệ Phần mềm – Trường Đại học Sài Gòn**. Repository hiện triển khai MVP gồm menu, tùy chọn sản phẩm, giỏ hàng, tạo đơn hàng và xác thực tài khoản.

## Mục lục

1. [Giới thiệu dự án](#1-giới-thiệu-dự-án)
2. [Công nghệ sử dụng](#2-công-nghệ-sử-dụng)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Các chức năng đã triển khai](#4-các-chức-năng-đã-triển-khai)
5. [Cài đặt và chạy dự án](#5-cài-đặt-và-chạy-dự-án)
6. [Cấu hình môi trường](#6-cấu-hình-môi-trường)
7. [Danh sách API](#7-danh-sách-api)
8. [Hướng dẫn sử dụng](#8-hướng-dẫn-sử-dụng)
9. [Kiểm thử và chất lượng mã nguồn](#9-kiểm-thử-và-chất-lượng-mã-nguồn)
10. [Tiến độ Assignment 1](#10-tiến-độ-assignment-1)
11. [Các giới hạn hiện tại](#11-các-giới-hạn-hiện-tại)
12. [Hướng phát triển tiếp theo](#12-hướng-phát-triển-tiếp-theo)

## 1. Giới thiệu dự án

BrewLite giúp khách hàng xem menu đồ uống, tùy chỉnh món theo size và topping, quản lý giỏ hàng, đăng ký/đăng nhập và gửi đơn hàng. Phạm vi hiện tại là MVP phục vụ phát triển và kiểm thử cục bộ; chưa phải hệ thống thương mại đã triển khai production.

## 2. Công nghệ sử dụng

- **Frontend:** Next.js 16, React 19, TypeScript.
- **Backend:** NestJS 12, TypeScript.
- **Cơ sở dữ liệu:** PostgreSQL 17.
- **ORM:** TypeORM; schema được tạo/cập nhật bằng migration, không bật `synchronize`.
- **Môi trường phát triển cơ sở dữ liệu:** Docker Compose.
- **Xác thực:** JWT với `@nestjs/jwt`; mật khẩu băm bằng bcrypt.
- **Giỏ hàng:** React Context, lưu và khôi phục dữ liệu bằng `localStorage`.
- **Kiểm thử:** Vitest và Testing Library (Web); Jest (API).

## 3. Cấu trúc thư mục

```text
.
├── .github/workflows/       # GitHub Actions CI
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── auth/        # Đăng ký, đăng nhập, JWT guard
│   │   │   ├── database/    # Migration TypeORM
│   │   │   ├── orders/      # Tạo đơn, DTO, entity, nghiệp vụ giá
│   │   │   ├── products/    # API sản phẩm và catalog mẫu
│   │   │   └── users/       # User entity và truy cập dữ liệu
│   │   └── test/            # Kiểm thử API
│   └── web/
│       ├── public/          # Tài nguyên tĩnh
│       └── src/
│           ├── app/         # Trang Menu, sản phẩm, giỏ hàng, tài khoản
│           ├── components/  # Header, providers, cart toast
│           └── lib/         # Logic giá và kiểm thử
├── docs/
│   ├── architecture/
│   ├── diagrams/
│   └── requirements/
├── docker-compose.yml       # PostgreSQL 17
├── .env.example             # Mẫu biến môi trường
└── README.md
```

Docker Compose chỉ khởi chạy PostgreSQL; API và Web được chạy bằng các lệnh npm riêng bên dưới. `docs/deployment.md` là tài liệu đề xuất triển khai, không xác nhận rằng ứng dụng đã được deploy.

## 4. Các chức năng đã triển khai

Trạng thái dưới đây dựa trên mã nguồn hiện tại và các kiểm tra đã thực hiện; không đồng nghĩa với triển khai production.

| Task | Nội dung | Trạng thái và ghi chú |
|---|---|---|
| 1 | Khởi tạo dự án | Đã có cấu trúc Web/API, tài liệu dự án và CI. |
| 2 | API sản phẩm | Đã có danh sách và chi tiết sản phẩm; catalog hiện là dữ liệu mẫu trong bộ nhớ. |
| 3 | Trang Menu | Đã có trang Menu tải dữ liệu từ API, trạng thái loading/lỗi và liên kết đến chi tiết. |
| 4 | Chi tiết sản phẩm | Đã có chọn size S/M/L, topping và tính giá theo phụ thu mẫu. |
| 5 | Giỏ hàng | Đã có React Context, khôi phục từ `localStorage`, thay đổi số lượng, xóa món, tính tổng, badge Header và thông báo thêm món. |
| 6 | API tạo đơn | Đã có `POST /orders`, validation, tính lại giá ở backend, lưu Order/OrderItem bằng transaction và trạng thái `PENDING`. |
| 7 | Tài khoản và xác thực | Đã có đăng ký/đăng nhập, bcrypt, JWT và bảo vệ tạo đơn; trang tài khoản hiển thị thông tin session hiện tại. |
| 8 | Thanh toán mock | Chưa triển khai. |
| 9 | Xác nhận, lịch sử đơn và bàn giao | Chưa hoàn thiện. Tạo đơn trả mã đơn/trạng thái qua API và giao diện giỏ hàng; chưa có trang lịch sử hoặc luồng xác nhận riêng. |
| 10 | Nghiệp vụ Backend nâng cao | Chưa triển khai state machine, idempotency, quản lý tồn kho hoặc loyalty. |

Size/topping và catalog hiện dùng dữ liệu, quy tắc giá mẫu; cần đồng bộ và thay bằng nguồn dữ liệu nghiệp vụ thực trước khi vận hành thực tế.

## 5. Cài đặt và chạy dự án

### Yêu cầu

- Git.
- Node.js 24 (đúng phiên bản CI) và npm.
- Docker Desktop có Docker Compose.

### Clone và cấu hình

Mở PowerShell:

```powershell
git clone https://github.com/quang-vu2808/brewlite.git
Set-Location brewlite
Copy-Item .env.example .env
notepad .env
```

Trong `.env`, thay `DB_PASSWORD` bằng mật khẩu local và `JWT_SECRET` bằng chuỗi bí mật riêng tối thiểu 32 byte. Có thể tạo chuỗi ngẫu nhiên URL-safe bằng Node.js:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Không chia sẻ hoặc commit `.env`. Để cấu hình frontend, tạo `apps/web/.env.local`:

```powershell
Set-Content apps/web/.env.local "NEXT_PUBLIC_API_URL=http://localhost:3001"
```

### Khởi động PostgreSQL

Từ thư mục gốc repository, sau khi đã điền `DB_PASSWORD` trong `.env`:

```powershell
docker compose up -d db
docker compose ps
```

Compose tạo volume tên `brewlite_pgdata` để lưu dữ liệu. Không dùng `docker compose down -v` để xử lý lỗi kết nối. Nếu đã có volume từ lần chạy trước, mật khẩu trong `.env` phải khớp với thông tin khởi tạo database hiện tại; đổi biến môi trường không tự đổi mật khẩu bên trong volume.

### Cài dependencies và chạy API

Mở một cửa sổ PowerShell tại thư mục gốc:

```powershell
Set-Location apps/api
npm ci
npm run start:dev
```

Khi API khởi động, TypeORM chạy các migration đã đăng ký. Không cần chạy lệnh tạo schema thủ công.

### Cài dependencies và chạy Web

Mở một cửa sổ PowerShell khác tại thư mục gốc:

```powershell
Set-Location apps/web
npm ci
npm run dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:3001>
- Danh sách sản phẩm: <http://localhost:3001/products>

API hiện cấu hình CORS cho `http://localhost:3000`. Cấu hình host, origin và secret cần được rà soát trước khi triển khai môi trường khác.

## 6. Cấu hình môi trường

`.env.example` là mẫu cho file `.env` tại thư mục gốc. Dùng giá trị riêng cho máy/môi trường của bạn; không commit file `.env`.

| Biến | Dùng bởi | Ý nghĩa |
|---|---|---|
| `DB_HOST` | API | Host PostgreSQL; khi chạy API trực tiếp trên máy thường là `localhost`. |
| `DB_PORT` | API | Cổng PostgreSQL; mặc định `5432`. |
| `DB_USER` | API | Tài khoản PostgreSQL; mặc định `brewlite`. |
| `DB_PASSWORD` | Docker Compose, API | Mật khẩu PostgreSQL; bắt buộc. |
| `DB_NAME` | API | Tên database; mặc định `brewlite`. |
| `JWT_SECRET` | API | Khóa ký JWT, bắt buộc và tối thiểu 32 byte. |
| `PORT` | API | Cổng NestJS; mặc định `3001`. |
| `NEXT_PUBLIC_API_URL` | Web | URL API, đặt trong `apps/web/.env.local`; mặc định `http://localhost:3001`. |

Docker Compose cố định tên database/user mặc định `brewlite` và đọc `DB_PASSWORD` từ `.env`. API đọc các biến `DB_*` và `JWT_SECRET` từ `.env` ở thư mục gốc. Không đặt mật khẩu hoặc secret thật trong README, mã nguồn hay log.

## 7. Danh sách API

| Method | Endpoint | Chức năng | Yêu cầu JWT |
|---|---|---|---|
| `GET` | `/products` | Lấy danh sách sản phẩm | Không |
| `GET` | `/products/:id` | Lấy chi tiết sản phẩm; trả 404 nếu không tồn tại | Không |
| `POST` | `/auth/register` | Đăng ký tài khoản | Không |
| `POST` | `/auth/login` | Đăng nhập và nhận JWT | Không |
| `POST` | `/orders` | Tạo đơn từ các sản phẩm/tùy chọn; backend kiểm tra và tính lại giá | Có |

Các endpoint trên được đối chiếu với Controller hiện có. API tạo đơn nhận thông tin giỏ hàng, không tin giá do client gửi, và trả thông tin đơn mới ở trạng thái `PENDING`.

## 8. Hướng dẫn sử dụng

1. Mở Menu tại trang chủ và chọn một sản phẩm để xem chi tiết.
2. Chọn size và topping; tổng giá được cập nhật theo tùy chọn.
3. Thêm sản phẩm vào giỏ. Có thể mở giỏ từ Header; cart được lưu trong trình duyệt.
4. Trong giỏ, tăng/giảm số lượng hoặc xóa sản phẩm.
5. Đăng ký hoặc đăng nhập để tiếp tục tạo đơn.
6. Gửi đơn từ giỏ hàng. Khi thành công, API trả mã đơn và trạng thái `PENDING`; giỏ chỉ được xóa sau khi tạo đơn thành công.
7. Trang Tài khoản hiển thị session đang đăng nhập. Token chỉ được giữ trong bộ nhớ nên tải lại trang cần đăng nhập lại.

## 9. Kiểm thử và chất lượng mã nguồn

Chạy lệnh trong đúng thư mục ứng dụng; repository không định nghĩa script npm chung ở thư mục gốc.

### Frontend

```powershell
Set-Location apps/web
npm run lint
npm run test -- --run
npx tsc --noEmit
npm run build
```

### Backend

```powershell
Set-Location apps/api
npm run lint
npm run test -- --runInBand
npm run build
```

CI tại `.github/workflows/ci.yml` chạy khi có pull request vào `main`. Hai job Web và API lần lượt cài dependencies bằng `npm ci`, chạy lint, unit test và build với Node.js 24. API có script `test:e2e`; README không xem script đó là bằng chứng cho một bộ integration test đã chạy thành công.

Tại lần kiểm tra gần nhất trước khi cập nhật giao diện Tài khoản: Web có 10 unit tests và API có 28 unit tests; lint, build, cùng TypeScript Web đều đạt. Những kết quả này chưa bao gồm xác minh mới nhất cho thay đổi UI Tài khoản trong phiên hiện tại.

## 10. Tiến độ Assignment 1

| Task | Hạng mục | Tiến độ |
|---|---|---|
| 1 | Khởi tạo dự án | Đã triển khai |
| 2 | API sản phẩm | Đã triển khai |
| 3 | Trang Menu | Đã triển khai |
| 4 | Chi tiết và tùy chọn sản phẩm | Đã triển khai |
| 5 | Giỏ hàng | Đã triển khai |
| 6 | API tạo đơn hàng | Đã triển khai |
| 7 | Đăng ký, đăng nhập và bảo vệ API | Đã triển khai |
| 8 | Thanh toán mock | Chưa triển khai |
| 9 | Xác nhận, lịch sử đơn và bàn giao | Chưa hoàn thiện |
| 10 | Nghiệp vụ Backend nâng cao | Chưa triển khai |

Trạng thái phản ánh tính năng có trong mã nguồn và không xác nhận triển khai production. Xem thêm ghi chú giới hạn ở [mục 11](#11-các-giới-hạn-hiện-tại).

## 11. Các giới hạn hiện tại

- Danh sách sản phẩm chưa lưu trong PostgreSQL; API dùng catalog mẫu trong bộ nhớ.
- Phụ thu size và topping là cấu hình mẫu; chưa có quản trị giá hoặc đồng bộ từ backend với một nguồn dữ liệu giá tập trung.
- JWT có thời hạn 15 phút và chỉ lưu trong bộ nhớ frontend. Tải lại trang phải đăng nhập lại; logout phía client không thu hồi token đã phát trước khi token hết hạn.
- Không có refresh token, lịch sử đơn, thanh toán thật hoặc thanh toán mock.
- Loyalty chưa triển khai; điểm hiển thị trên trang tài khoản không đại diện cho hệ thống tích điểm.
- CORS hiện cho phép origin local `http://localhost:3000`; cần cấu hình phù hợp trước khi triển khai.
- Docker Compose chỉ quản lý PostgreSQL, không đóng gói hoặc khởi chạy Web/API.

## 12. Hướng phát triển tiếp theo

- **Task 8:** triển khai luồng thanh toán mock.
- **Task 9:** xây dựng trang xác nhận, lịch sử đơn và quy trình bàn giao.
- **Task 10:** bổ sung state machine cho đơn, idempotency, quản lý tồn kho và loyalty.
- Thay catalog và cấu hình giá mẫu bằng dữ liệu nghiệp vụ có nguồn quản trị đáng tin cậy.
