# BrewLite

BrewLite là ứng dụng web đặt đồ uống, phát triển cho học phần **Công nghệ Phần mềm – Trường Đại học Sài Gòn**. Repository hiện triển khai MVP gồm menu, tùy chọn sản phẩm, giỏ hàng, tạo đơn hàng, xác thực tài khoản và thanh toán mô phỏng.

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
│   │   │   ├── payments/    # Thanh toán mock và lịch sử lần thử
│   │   │   ├── products/    # API sản phẩm và catalog mẫu
│   │   │   └── users/       # User entity và truy cập dữ liệu
│   │   └── test/            # Kiểm thử API
│   └── web/
│       ├── public/          # Tài nguyên tĩnh
│       └── src/
│           ├── app/         # Menu, sản phẩm, giỏ hàng, checkout, tài khoản
│           ├── components/  # Header, auth/cart/checkout providers, toast
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
| 8 | Thanh toán mock | Đã có lựa chọn Ví/Thẻ mô phỏng, API có JWT, lưu Payment và cập nhật trạng thái đơn trong transaction; xem kết quả kiểm thử tại mục 9. |
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
| `MOCK_PAYMENT_MODE` | API | `SUCCESS` (mặc định) hoặc `FAIL`; dùng mô phỏng kết quả, không gọi cổng thanh toán. |
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
| `POST` | `/payments` | Thanh toán mô phỏng đơn của người dùng; ghi lần thử và cập nhật trạng thái đơn | Có |

`POST /payments` nhận JSON dạng `{"orderId":"<UUID>","method":"WALLET"}`; `method` hỗ trợ `WALLET` và `CARD`. API lấy số tiền từ đơn đã lưu, không nhận `amount` từ client, đồng thời chỉ cho chủ đơn thanh toán. API trả `SUCCESS`/`PAID` hoặc `FAILED`/`PAYMENT_FAILED` trong HTTP 201; lỗi xác thực, quyền sở hữu, trạng thái hoặc DTO dùng mã HTTP phù hợp.

Ví dụ response thanh toán thành công:

```json
{
  "paymentId": "UUID",
  "orderId": "UUID",
  "method": "WALLET",
  "status": "SUCCESS",
  "orderStatus": "PAID",
  "amount": 75000,
  "message": "Thanh toán giả lập thành công"
}
```

Khi mock thất bại, response có `status: "FAILED"` và `orderStatus: "PAYMENT_FAILED"`; đây là kết quả mô phỏng trả HTTP 201, không phải lỗi HTTP. `paymentId` và `orderId` thực tế là UUID do hệ thống tạo/lưu.

Mọi đơn mới bắt đầu ở `PENDING`. Chế độ mock mặc định là thành công; đặt `MOCK_PAYMENT_MODE=FAIL` trong môi trường API để mô phỏng thất bại. Cần khởi động lại API sau khi đổi cấu hình. Đây chỉ là mô phỏng, không thu tiền và không kết nối MoMo, ZaloPay, Stripe, VNPAY hay dịch vụ thanh toán khác.

## 8. Hướng dẫn sử dụng

1. Mở Menu tại trang chủ và chọn một sản phẩm để xem chi tiết.
2. Chọn size và topping; tổng giá được cập nhật theo tùy chọn.
3. Thêm sản phẩm vào giỏ. Có thể mở giỏ từ Header; cart được lưu trong trình duyệt.
4. Trong giỏ, tăng/giảm số lượng hoặc xóa sản phẩm.
5. Đăng ký hoặc đăng nhập để tiếp tục tạo đơn.
6. Gửi đơn từ giỏ hàng; API lưu đơn ở trạng thái `PENDING` và chuyển sang bước thanh toán.
7. Chọn Ví điện tử hoặc Thẻ mô phỏng rồi thanh toán. Khi thành công đơn thành `PAID` và giỏ được xóa; khi thất bại đơn thành `PAYMENT_FAILED`, giỏ được giữ và có thể thử lại trên cùng đơn.
8. Tải lại trang không tự tạo đơn hoặc gửi thanh toán. Thông tin đơn chờ thanh toán được giữ trong `sessionStorage` tab hiện tại; nếu cần đăng nhập lại, phiên JWT vẫn chỉ ở bộ nhớ và không được ghi vào storage.
9. Trang Tài khoản hiển thị session đang đăng nhập. Token chỉ được giữ trong bộ nhớ nên tải lại trang cần đăng nhập lại.

Schema được mở rộng bằng migration `1710000002000-CreatePayments.ts`, tạo bảng `payments` và khóa ngoại tới `orders`; API tự chạy migration khi khởi động. Cột trạng thái `orders.status` đã là `varchar(20)`, nên chứa được `PAID` và `PAYMENT_FAILED` mà không cần thay đổi kiểu cột. Không xóa database hoặc Docker volume để chạy migration.

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
npx tsc --noEmit
npm run lint
npm run test -- --runInBand
npm run build
```

Để kiểm tra thanh toán thất bại cục bộ, khởi động API trong cùng PowerShell với biến môi trường:

```powershell
$env:MOCK_PAYMENT_MODE = "FAIL"
npm run start:dev
```

Mặc định (không đặt biến, hoặc đặt `SUCCESS`) mô phỏng thành công. Khởi động lại API ở chế độ `SUCCESS` để kiểm tra thành công. Chế độ này chỉ điều khiển kết quả giả lập và không được client gửi lên.

CI tại `.github/workflows/ci.yml` chạy khi có pull request vào `main`. Hai job Web và API lần lượt cài dependencies bằng `npm ci`, chạy lint, unit test và build với Node.js 24. API có script `test:e2e`; README không xem script đó là bằng chứng cho một bộ integration test đã chạy thành công.

Kết quả kiểm tra Task 8: Web lint, TypeScript và build đạt; **14/14** unit tests trong 4 file đạt. API lint, TypeScript và build đạt; **37/37** unit tests trong 8 suite đạt. Kiểm tra trực tiếp trên PostgreSQL 17 xác nhận migration và bảng `payments`; đã thử Wallet/Card thành công, mock thất bại, DTO/method sai, JWT thiếu/sai, đơn không tồn tại/không thuộc user/đã PAID, số tiền gửi thêm bị từ chối, request đồng thời cho kết quả HTTP `201` và `409`, và rollback khi cố ý làm lỗi bước cập nhật đơn. Dữ liệu user/order tạo riêng cho kiểm tra đã được xóa sau đó; dữ liệu trước đó được giữ nguyên.

Kiểm thử giao diện trên trình duyệt xác nhận đăng ký/đăng nhập → Menu/chi tiết → giỏ hàng → tạo đơn → Card mô phỏng thành công, hiển thị `PAID` và xóa cart. Màn hình thất bại được kiểm tra với response giả lập ở trình duyệt; API failure thật đã được kiểm tra riêng với PostgreSQL ở chế độ `MOCK_PAYMENT_MODE=FAIL`. Tải lại trang checkout không tự gửi lại request thanh toán; tại viewport mobile nội dung không tràn ngang.

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
| 8 | Thanh toán mock | Đã triển khai; kiểm tra kết quả test ở mục 9 |
| 9 | Xác nhận, lịch sử đơn và bàn giao | Chưa hoàn thiện |
| 10 | Nghiệp vụ Backend nâng cao | Chưa triển khai |

Trạng thái phản ánh tính năng có trong mã nguồn và không xác nhận triển khai production. Xem thêm ghi chú giới hạn ở [mục 11](#11-các-giới-hạn-hiện-tại).

## 11. Các giới hạn hiện tại

- Danh sách sản phẩm chưa lưu trong PostgreSQL; API dùng catalog mẫu trong bộ nhớ.
- Phụ thu size và topping là cấu hình mẫu; chưa có quản trị giá hoặc đồng bộ từ backend với một nguồn dữ liệu giá tập trung.
- JWT có thời hạn 15 phút và chỉ lưu trong bộ nhớ frontend. Tải lại trang phải đăng nhập lại; logout phía client không thu hồi token đã phát trước khi token hết hạn.
- Thông tin đơn thanh toán được giữ trong `sessionStorage` của tab để phục hồi bước checkout; JWT không được lưu ở đó.
- Thanh toán chỉ là mô phỏng: mode `SUCCESS`/`FAIL` áp dụng cho mọi phương thức trên tiến trình API đang chạy, không đại diện cho cổng thanh toán hoặc giao dịch tiền thật.
- Không có refresh token, lịch sử đơn hoàn chỉnh hoặc thanh toán thật.
- Loyalty chưa triển khai; điểm hiển thị trên trang tài khoản không đại diện cho hệ thống tích điểm.
- CORS hiện cho phép origin local `http://localhost:3000`; cần cấu hình phù hợp trước khi triển khai.
- Docker Compose chỉ quản lý PostgreSQL, không đóng gói hoặc khởi chạy Web/API.

## 12. Hướng phát triển tiếp theo

- **Task 9:** xây dựng trang xác nhận, lịch sử đơn và quy trình bàn giao.
- **Task 10:** bổ sung state machine cho đơn, idempotency, quản lý tồn kho và loyalty.
- Thay catalog và cấu hình giá mẫu bằng dữ liệu nghiệp vụ có nguồn quản trị đáng tin cậy.
