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
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── auth/        # Đăng ký, đăng nhập, JWT guard
│   │   │   ├── database/    # Migration TypeORM
│   │   │   ├── orders/      # Đơn hàng, state machine, tồn kho sản phẩm và staff queue
│   │   │   ├── ingredients/ # Nguyên liệu, điều chỉnh kho, công thức và tiêu hao theo đơn
│   │   │   ├── payments/    # Provider mock, QR demo và idempotency
│   │   │   ├── promotions/  # Khuyến mãi, lịch hiệu lực và giới hạn lượt dùng
│   │   │   ├── products/    # API sản phẩm và catalog mẫu
│   │   │   └── users/       # User entity, điểm thưởng và vai trò
│   │   └── test/            # Kiểm thử API
│   └── web/
│       ├── Dockerfile
│       ├── public/          # Tài nguyên tĩnh
│       └── src/
│           ├── app/         # Menu, giỏ hàng, checkout, đăng nhập Staff và trang staff
│           ├── components/  # Header, providers, toast, đơn hàng và quản lý nguyên liệu
│           └── lib/         # Logic giá, tồn kho và kiểm thử
├── docs/
│   ├── architecture/
│   ├── diagrams/
│   └── requirements/
├── docker-compose.yml       # PostgreSQL, API và Web
├── .dockerignore
├── .env.example             # Mẫu biến môi trường
└── README.md
```

Docker Compose có thể chạy toàn bộ PostgreSQL, API và Web; cũng có thể chạy riêng database để phát triển Web/API bằng npm. `docs/deployment.md` là tài liệu đề xuất triển khai, không xác nhận rằng ứng dụng đã được deploy.

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
| 7 | Tài khoản và xác thực | Đã có đăng ký/đăng nhập, bcrypt, JWT, bảo vệ API và cấp `CUSTOMER` mặc định; STAFF sau đăng nhập vào `/staff`, vai trò được xác minh lại từ Backend. |
| 8 | Thanh toán mock | Đã có lựa chọn Ví/Thẻ mô phỏng, API có JWT, lưu Payment và cập nhật trạng thái đơn trong transaction; xem kết quả kiểm thử tại mục 9. |
| 9 | Xác nhận, lịch sử đơn và bàn giao | Đã có API lịch sử/chi tiết theo chủ đơn, giao diện lịch sử/chi tiết và Docker Compose chạy Web/API/PostgreSQL; đã smoke-test API/UI. Quy trình bàn giao hoặc xác nhận nhận hàng chưa triển khai. |
| 10 | Nghiệp vụ Backend nâng cao | Đã có state machine, thanh toán idempotent, tồn kho versioned, quản trị khuyến mãi cho STAFF, cộng/đổi điểm và UI staff/customer; kết quả kiểm thử ở mục 9. |

Size/topping và catalog hiện dùng dữ liệu, quy tắc giá mẫu; cần đồng bộ và thay bằng nguồn dữ liệu nghiệp vụ thực trước khi vận hành thực tế.

### Nâng cấp sau Task 10

- Staff Orders có thể lọc riêng đơn đã hoàn thành và đã hủy; đơn vẫn được lưu trong PostgreSQL.
- Nhân viên được hủy đơn ở trạng thái mà state machine cho phép. Thao tác được bảo vệ bởi JWT/`StaffGuard`; nguyên liệu, điểm đổi, điểm thưởng và lượt dùng khuyến mãi được xử lý trong transaction, tối đa một lần.
- Trang `/staff/ingredients` quản lý tên, mã, đơn vị, tồn, ngưỡng cảnh báo, nhập/xuất kho có lý do và công thức theo từng sản phẩm. Điều chỉnh kho được ghi vào bảng audit.
- Khu vực kho chia thành bốn tab: nguyên liệu, vật tư đóng gói, topping và công thức. Mỗi biến động kho đều cập nhật bản ghi ingredient dùng chung và cùng lịch sử audit; công thức không tạo tồn kho riêng.
- Vật tư có category `CUP` hoặc `LY` và size tương thích được tự động tiêu hao một cái cho mỗi ly tương ứng trên tất cả đồ uống. Các vật tư khác được tham chiếu trong công thức theo sản phẩm-size.
- Tồn sản phẩm được tính từ tồn nguyên liệu và định lượng trong công thức, lấy giới hạn thấp nhất trong các nguyên liệu. Khi tạo đơn, Backend trừ nguyên liệu trong cùng transaction; thiếu tồn làm đơn bị rollback. Nguyên liệu dùng version/optimistic concurrency.
- Khả dụng được tính độc lập theo S/M/L; size chưa có công thức riêng được báo chưa cấu hình và không dùng định lượng công thức chung. Công thức size mới hoặc được chỉnh sửa ở trạng thái `PENDING`, không được tính tồn hay dùng để tiêu hao cho tới khi quản lý xác nhận. Nhân viên có thể chép công thức chung hoặc size khác vào bản nháp; bản gốc được giữ nguyên. Bao bì dùng chung tồn kho và chỉ tiêu hao khi có quy tắc đóng gói được cấu hình, ngoại trừ ly tự động khớp size.
- Danh mục vật tư gồm Ly size S/M/L, nắp, ống hút và bịch; migration tạo mặt hàng còn thiếu với tồn ban đầu bằng 0, không tạo biến động kho. Nhân viên cần kiểm kê rồi nhập số lượng thực tế. Không mặc định tiêu hao nắp, ống hút hoặc bịch.
- Topping liên kết một bản ghi nguyên liệu dùng chung; định lượng một phần và trạng thái bật/tắt được cấu hình một lần tại tab Kho topping. Mọi topping đang bật áp dụng tự động cho tất cả đồ uống và size, kể cả sản phẩm tạo sau này; số phần khả dụng do tồn kho thực tế quyết định, không có giới hạn thủ công theo sản phẩm-size. Topping tùy chọn không làm món chính hết hàng.
- Migration `1710000007000-RecipesPackagingAndToppings` bổ sung công thức theo size, phân loại vật tư, quy tắc đóng gói và cấu hình topping; không seed tồn kho, định lượng size, packaging hay định lượng topping. Nhân viên cần cấu hình các dữ liệu này tại `/staff/ingredients` trước khi sử dụng.
- Migration `1710000008000-EnsureProductToppingRecipes` là migration bổ sung an toàn cho database đã ghi nhận migration 7000 nhưng thiếu bảng quy tắc topping; chỉ tạo bảng còn thiếu và không xóa dữ liệu.
- Migration `1710000009000-SharedToppingPortionQuantity` thêm định lượng một phần trên danh mục topping, không tạo kho tồn mới. Không suy ra định lượng dùng chung từ công thức theo sản phẩm.
- Migration `1710000010000-LinkExistingToppingsToIngredients` tạo nguyên liệu `CREAM_CHEESE` (g), `ESPRESSO` (ml), `PEARLS` (g) với tồn 0 nếu mã nguyên liệu chưa tồn tại; nếu đã có thì giữ nguyên tồn và liên kết topping hiện có nếu chưa được liên kết. Migration giữ giá topping, không bật bán và không đặt định lượng. Hệ thống hiện không có công thức espresso từ hạt cà phê; Espresso được quản lý như nguyên liệu ml riêng để tránh tự suy diễn tỷ lệ pha hoặc trừ hạt cà phê hai lần.
- Migration `1710000011000-UseSharedToppingPortionInConstraint` cập nhật ràng buộc DB cũ để kiểm tra `portion_quantity_required` dùng chung khi bật bán topping. Topping cũ chưa có ingredient hoặc định lượng được giữ tắt cho đến khi nhân viên cấu hình.
- Migration `1710000012000-SeedPackagingCatalog` bổ sung idempotent danh mục ly size S/M/L, nắp, ống hút và bịch với tồn 0; tái sử dụng bản ghi hiện có tương thích và không xóa dữ liệu khi rollback.
- Migration `1710000013000-RequireConfirmedSizeRecipes` thêm trạng thái phê duyệt; công thức size hiện hữu mặc định chờ xác nhận, không thay đổi định lượng hoặc tồn. Đây là migration forward-only để tránh rollback làm công thức chưa duyệt được kích hoạt lại. API có `PATCH /ingredients/recipes/:productId/:size/confirm` để xác nhận một size sau khi kiểm tra định lượng và ly tương thích.
- `/staff/login` là cổng đăng nhập riêng. Trang dùng Auth API hiện hữu, chỉ role `STAFF` mới vào Dashboard; CUSTOMER bị từ chối. Đăng nhập CUSTOMER tại `/login` mặc định về Menu (`/`), nhưng vẫn giữ `returnTo` nội bộ hợp lệ như `/checkout`.
- Migration `1710000005000-CreateIngredientInventory` tạo schema nguyên liệu/công thức/audit và seed định lượng/tồn mẫu cho ba sản phẩm catalog; không thay đổi bảng hay volume dữ liệu cũ.

### Bảng file của đợt nâng cấp sau Task 10

| Đường dẫn | Thay đổi | Tác dụng |
|---|---|---|
| `apps/api/src/app.module.ts` | Chỉnh sửa | Đăng ký entity, migration và module nguyên liệu với TypeORM/NestJS. |
| `apps/api/src/database/migrations/1710000005000-CreateIngredientInventory.ts` | Tạo mới | Tạo bảng nguyên liệu, recipe, tiêu hao theo đơn và audit điều chỉnh; thêm dữ liệu mẫu ban đầu. |
| `apps/api/src/database/migrations/1710000007000-RecipesPackagingAndToppings.ts` | Tạo mới | Mở rộng kho dùng chung, công thức size, vật tư và danh mục topping, không seed định lượng/tồn mới. |
| `apps/api/src/database/migrations/1710000008000-EnsureProductToppingRecipes.ts` | Tạo mới | Khôi phục an toàn bảng công thức topping nếu migration trước đã được ghi nhận nhưng thiếu bảng. |
| `apps/api/src/database/migrations/1710000009000-SharedToppingPortionQuantity.ts` | Tạo mới | Lưu định lượng mỗi phần topping trong danh mục topping. |
| `apps/api/src/database/migrations/1710000010000-LinkExistingToppingsToIngredients.ts` | Tạo mới | Tái sử dụng hoặc thêm kho nguyên liệu topping với tồn 0, rồi liên kết catalog hiện có mà không đổi giá/định lượng. |
| `apps/api/src/database/migrations/1710000011000-UseSharedToppingPortionInConstraint.ts` | Tạo mới | Sửa điều kiện bật bán topping để phù hợp với định lượng chung hiện hành. |
| `apps/api/src/ingredients/ingredients.module.ts` | Tạo mới | Khai báo module quản lý nguyên liệu và các entity liên quan. |
| `apps/api/src/ingredients/ingredients.controller.ts` | Tạo mới | Cung cấp API kho, cập nhật thông tin, audit và công thức; bảo vệ bằng JWT/StaffGuard. |
| `apps/api/src/ingredients/toppings.controller.ts` | Tạo mới | Tạo/cập nhật danh mục topping và cung cấp topping khả dụng cho khách; staff routes được bảo vệ. |
| `apps/api/src/ingredients/ingredients.service.ts` | Tạo mới | Xử lý tồn/công thức/audit và trừ nguyên liệu đồng thời trong transaction tạo đơn. |
| `apps/api/src/ingredients/entities/ingredient.entity.ts` | Tạo mới | Lưu tên, mã, đơn vị, tồn, ngưỡng cảnh báo và version nguyên liệu. |
| `apps/api/src/ingredients/entities/ingredient-recipe.entity.ts` | Tạo mới | Lưu định lượng nguyên liệu cần cho mỗi sản phẩm. |
| `apps/api/src/ingredients/entities/order-ingredient-consumption.entity.ts` | Tạo mới | Lưu snapshot nguyên liệu đã tiêu hao để có thể hoàn kho đúng một lần khi hủy đơn. |
| `apps/api/src/ingredients/entities/ingredient-adjustment.entity.ts` | Tạo mới | Ghi người thao tác, lượng điều chỉnh, lý do và thời gian. |
| `apps/api/src/ingredients/dto/create-ingredient.dto.ts` | Tạo mới | Validate dữ liệu tạo nguyên liệu. |
| `apps/api/src/ingredients/dto/update-ingredient.dto.ts` | Tạo mới | Validate thông tin nguyên liệu được phép cập nhật. |
| `apps/api/src/ingredients/dto/adjust-ingredient-stock.dto.ts` | Tạo mới | Validate lượng và lý do nhập/xuất kho. |
| `apps/api/src/ingredients/dto/replace-product-recipe.dto.ts` | Tạo mới | Validate danh sách thành phần của công thức sản phẩm. |
| `apps/api/src/ingredients/dto/create-topping.dto.ts` | Tạo mới | Validate topping mới và liên kết tới kho nguyên liệu dùng chung. |
| `apps/api/src/orders/orders.module.ts` | Chỉnh sửa | Kết nối IngredientsModule với luồng đơn hàng. |
| `apps/api/src/orders/orders.service.ts` | Chỉnh sửa | Lọc hàng đợi theo trạng thái lưu trữ; hỗ trợ nhân viên hủy đơn theo state machine; tích hợp trừ/hoàn tồn nguyên liệu theo transaction. |
| `apps/api/src/orders/dto/staff-order-query.dto.ts` | Chỉnh sửa | Cho phép lọc các trạng thái đơn bao gồm `COMPLETED` và `CANCELLED`. |
| `apps/api/src/orders/dto/change-order-status.dto.ts` | Chỉnh sửa | Cho phép gửi yêu cầu hủy đơn từ thao tác Staff; service vẫn kiểm tra quyền chuyển trạng thái. |
| `apps/api/src/orders/orders.service.spec.ts` | Chỉnh sửa | Bổ sung kiểm tra unit cho phối hợp tạo đơn với dịch vụ nguyên liệu. |
| `apps/api/test/task10.integration.e2e-spec.ts` | Chỉnh sửa | Kiểm tra PostgreSQL thật cho lịch sử đơn, hủy, recipe bắt buộc, audit và tranh chấp tồn nguyên liệu. |
| `apps/web/src/app/staff/login/page.tsx` | Tạo mới | Cổng đăng nhập nhân viên riêng, dùng Auth API/JWT và chặn CUSTOMER. |
| `apps/web/src/app/staff/login/page.test.tsx` | Tạo mới | Kiểm tra chuyển hướng STAFF, từ chối CUSTOMER và return URL an toàn. |
| `apps/web/src/app/staff/ingredients/page.tsx` | Tạo mới | Route `/staff/ingredients`. |
| `apps/web/src/components/staff-inventory-workspace.tsx` | Tạo mới | Giao diện bốn tab kho nguyên liệu/vật tư/topping và công thức; nhập/xuất qua cùng nguồn kho. |
| `apps/web/src/components/staff-ingredients-panel.tsx` | Chỉnh sửa | Giữ export component cũ để tương thích các route đang sử dụng. |
| `apps/web/src/components/staff-ingredients-panel.test.tsx` | Chỉnh sửa | Kiểm tra tách kho dùng chung khỏi công thức và luồng điều chỉnh kho. |
| `apps/web/src/components/staff-orders-panel.tsx` | Chỉnh sửa | Thêm bộ lọc đơn đã hoàn thành/đã hủy và nút hủy có xác nhận. |
| `apps/web/src/components/staff-orders-panel.test.tsx` | Tạo mới | Kiểm tra lọc trạng thái lưu trữ và gửi thao tác hủy Staff. |
| `apps/web/src/components/staff-shell.tsx` | Chỉnh sửa | Thêm điều hướng quản lý nguyên liệu và đưa phiên chưa đăng nhập tới Staff Login. |
| `apps/web/src/app/staff/layout.tsx` | Chỉnh sửa | Không bọc trang Staff Login trong StaffShell; các trang vận hành khác vẫn được bảo vệ. |
| `apps/web/src/app/staff/page.tsx` | Chỉnh sửa | Thêm lối tắt từ dashboard tới quản lý nguyên liệu. |
| `apps/web/src/app/login/page.tsx` | Chỉnh sửa | CUSTOMER mặc định về Menu, giữ return URL nội bộ hợp lệ và liên kết Staff Login. |
| `apps/web/src/app/login/page.test.tsx` | Chỉnh sửa | Kiểm tra mặc định Menu và giữ đường dẫn checkout cho CUSTOMER. |
| `apps/web/src/app/register/page.tsx` | Chỉnh sửa | Dùng Menu làm đích mặc định sau đăng ký/đăng nhập tiếp theo. |
| `apps/web/src/app/globals.css` | Chỉnh sửa | Tạo kiểu responsive cho trang Staff Login, kho nguyên liệu, BOM và các nút đơn hàng. |
| `README.md` | Chỉnh sửa | Ghi nhận chức năng, API, migration, giới hạn và bảng file của đợt nâng cấp. |

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

Để chạy toàn bộ stack trong Docker:

```powershell
docker compose up --build -d
docker compose ps
```

Sau khi các dịch vụ healthy, mở <http://localhost:3002>. API lắng nghe tại <http://localhost:3003>. Nếu chỉ muốn chạy Web/API bằng npm, khởi động riêng database:

```powershell
docker compose up -d db
docker compose ps
```

Compose Task 9 tạo volume riêng `brewlite_task9_pgdata` và mặc định xuất bản PostgreSQL trên cổng `5433`, API trên `3003` và Web trên `3002`. Các cổng ứng dụng này tránh xung đột với tiến trình local thường dùng `3000/3001`; PostgreSQL/volume cũng tách biệt với database cũ ở cổng `5432`. Không dừng/xóa database hoặc volume cũ. Không dùng `docker compose down -v` để xử lý lỗi kết nối. Nếu volume Task 9 đã được khởi tạo, mật khẩu trong `.env` phải khớp; đổi biến môi trường không tự đổi mật khẩu trong database.

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

API local mặc định cho phép hai origin Web `http://localhost:3000` và `http://localhost:3002`, có thể cấu hình qua `WEB_ORIGIN`. Cần giới hạn lại danh sách này cho domain thực trước khi triển khai môi trường khác.

## 6. Cấu hình môi trường

`.env.example` là mẫu cho file `.env` tại thư mục gốc. Dùng giá trị riêng cho máy/môi trường của bạn; không commit file `.env`.

| Biến | Dùng bởi | Ý nghĩa |
|---|---|---|
| `DB_HOST` | API | Host PostgreSQL; khi chạy API trực tiếp trên máy thường là `localhost`. |
| `DB_PORT` | API chạy trực tiếp | Cổng PostgreSQL trên máy host; mặc định mẫu là `5433` cho Compose Task 9. |
| `DB_USER` | API | Tài khoản PostgreSQL; mặc định `brewlite`. |
| `DB_PASSWORD` | Docker Compose, API | Mật khẩu PostgreSQL; bắt buộc. |
| `DB_NAME` | API | Tên database; mặc định `brewlite`. |
| `JWT_SECRET` | API | Khóa ký JWT, bắt buộc và tối thiểu 32 byte. |
| `PORT` | API | Cổng NestJS; mặc định `3001`. |
| `WEB_ORIGIN` | API | Danh sách origin trình duyệt được phép, phân cách bằng dấu phẩy. |
| `PAYMENT_DEMO_ENABLED` | API | Mặc định `false`; chỉ khi bật `true` mới hiện và chấp nhận tùy chọn giả lập thanh toán thất bại. |
| `NEXT_PUBLIC_API_URL` | Web chạy trực tiếp | URL API, đặt trong `apps/web/.env.local`; mặc định `http://localhost:3001`. |
| `NEXT_PUBLIC_API_URL_DOCKER` | Docker Compose build Web | URL API mà trình duyệt truy cập; mặc định `http://127.0.0.1:3003`. |
| `DB_PUBLISHED_PORT` | Docker Compose | Cổng host xuất bản PostgreSQL; mặc định `5433`. |
| `API_PUBLISHED_PORT` | Docker Compose | Cổng host xuất bản API; mặc định `3003`. |
| `WEB_PUBLISHED_PORT` | Docker Compose | Cổng host xuất bản Web; mặc định `3002`. |

Docker Compose đọc `DB_USER`, `DB_PASSWORD`, `DB_NAME` để khởi tạo PostgreSQL; API container dùng host nội bộ `db:5432`. Khi API chạy trực tiếp trên máy, `DB_HOST=localhost` và `DB_PORT` phải trỏ tới cổng được publish. `JWT_SECRET` không được đưa vào Web. Compose build Web với `NEXT_PUBLIC_API_URL_DOCKER`, là URL trình duyệt truy cập được, không phải hostname nội bộ Docker. Không đặt mật khẩu hoặc secret thật trong README, mã nguồn hay log.

`MOCK_PAYMENT_MODE` không được dùng trong cấu hình hiện tại. Provider luôn là `MOCK`; checkbox demo failure chỉ bật khi `PAYMENT_DEMO_ENABLED=true`. Với Docker, đặt biến trong `.env` ở thư mục gốc rồi chạy `docker compose up -d --force-recreate api`; với API local, đặt biến trong môi trường trước khi chạy NestJS. Không có chế độ QR/ngân hàng thật.

## 7. Danh sách API

| Method | Endpoint | Chức năng | Yêu cầu JWT |
|---|---|---|---|
| `GET` | `/products` | Lấy danh sách sản phẩm | Không |
| `GET` | `/products/:id` | Lấy chi tiết sản phẩm; trả 404 nếu không tồn tại | Không |
| `POST` | `/auth/register` | Đăng ký tài khoản | Không |
| `POST` | `/auth/login` | Đăng nhập và nhận JWT | Không |
| `GET` | `/auth/me` | Thông tin tài khoản và điểm thành viên hiện tại | Có |
| `POST` | `/orders` | Tạo đơn từ các sản phẩm/tùy chọn; backend kiểm tra và tính lại giá | Có |
| `POST` | `/orders/preview` | Xem trước giá và kiểm tra tổng nhu cầu nguyên liệu của giỏ; chỉ đọc tồn kho | Có |
| `GET` | `/inventory` | Số ly tối đa theo công thức và tồn nguyên liệu; giữ các trường phản hồi cũ | Không |
| `GET` | `/orders/me` | Lịch sử đơn hàng của tài khoản đang đăng nhập | Có |
| `GET` | `/orders/:id` | Chi tiết đơn, chỉ chủ đơn mới xem được | Có |
| `POST` | `/orders/:id/cancel` | Chủ đơn hủy đơn ở trạng thái được phép; hoàn kho một lần | Có |
| `PATCH` | `/orders/:id/status` | Nhân viên chuyển trạng thái hoặc hủy đơn theo state machine | Có (vai trò `STAFF`) |
| `GET` | `/orders/staff/queue` | Hàng đợi có lọc trạng thái/tìm mã và phân trang; hỗ trợ cả COMPLETED/CANCELLED | Có (vai trò `STAFF`) |
| `GET` | `/orders/staff/summary` | Đếm đơn chờ pha chế, đang pha chế và sẵn sàng cho dashboard | Có (vai trò `STAFF`) |
| `GET` | `/ingredients` | Xem kho nguyên liệu và cờ cảnh báo tồn thấp | Có (vai trò `STAFF`) |
| `POST` | `/ingredients` | Tạo nguyên liệu | Có (vai trò `STAFF`) |
| `PATCH` | `/ingredients/:id` | Cập nhật tên, mã, đơn vị hoặc ngưỡng cảnh báo | Có (vai trò `STAFF`) |
| `POST` | `/ingredients/:id/adjustments` | Điều chỉnh tồn có lý do và ghi audit nhân viên | Có (vai trò `STAFF`) |
| `GET` | `/ingredients/:id/adjustments` | Xem 20 điều chỉnh kho gần nhất | Có (vai trò `STAFF`) |
| `GET` | `/ingredients/recipes` | Xem công thức theo sản phẩm | Có (vai trò `STAFF`) |
| `PUT` | `/ingredients/recipes/:productId` | Thay thế công thức định lượng nguyên liệu cho sản phẩm | Có (vai trò `STAFF`) |
| `PUT` | `/ingredients/recipes/:productId/:size` | Lưu công thức S/M/L ở trạng thái chờ xác nhận; danh sách rỗng xóa công thức size, không tự áp dụng công thức chung | Có (vai trò `STAFF`) |
| `PATCH` | `/ingredients/recipes/:productId/:size/confirm` | Xác nhận công thức size hợp lệ để tính tồn và cho phép đặt | Có (vai trò `STAFF`) |
| `PUT` | `/ingredients/packaging-recipes/:productId/:size` | Cấu hình vật tư đóng gói tiêu hao theo món/đơn/nhóm | Có (vai trò `STAFF`) |
| `PUT` | `/ingredients/topping-recipes/:productId/:size` | Tương thích dữ liệu/quy tắc topping cũ; không cần cấu hình để dùng topping toàn menu | Có (vai trò `STAFF`) |
| `GET` | `/toppings?productId=:id&size=S` | Danh mục topping đang bật, dùng chung cho mọi sản phẩm-size, giới hạn theo tồn kho | Không |
| `GET` | `/toppings/staff` | Danh mục topping cho cấu hình nhân viên | Có (vai trò `STAFF`) |
| `POST` | `/toppings` | Tạo danh mục topping liên kết tới một nguyên liệu kho dùng chung; topping mới mặc định tắt bán | Có (vai trò `STAFF`) |
| `PATCH` | `/toppings/:id` | Cập nhật tên/giá/trạng thái và nguyên liệu kho được liên kết | Có (vai trò `STAFF`) |
| `GET` | `/promotions` | Danh sách mã khuyến mãi còn hiệu lực | Không |
| `GET` | `/promotions/staff` | Danh sách đầy đủ để quản lý khuyến mãi | Có (vai trò `STAFF`) |
| `POST` | `/promotions` | Tạo mã khuyến mãi | Có (vai trò `STAFF`) |
| `PATCH` | `/promotions/:code` | Cập nhật cấu hình mã khuyến mãi | Có (vai trò `STAFF`) |
| `DELETE` | `/promotions/:code` | Ngừng sử dụng (soft-disable), giữ lịch sử đơn | Có (vai trò `STAFF`) |
| `GET` | `/payments/config` | Cấu hình demo công khai; không chứa bí mật | Không |
| `POST` | `/payments` | Thanh toán mô phỏng qua provider interface, idempotency và cộng điểm | Có |

`POST /orders` nhận `items`, `promoCode` và `redeemPoints` tùy chọn. Giá, tồn kho, số dư điểm, tính hợp lệ/lượt dùng mã đều được backend xác minh; tổng tiền client không được dùng. Mỗi điểm đổi giảm 100 VND, điểm bị giữ trong cùng transaction với việc tạo đơn và được hoàn khi hủy đơn. Điểm thưởng chỉ được cộng sau khi thanh toán mô phỏng thành công. Mã mẫu được seed bằng migration: `BREW10` giảm 10% (đơn tối thiểu 20.000 VND, giảm tối đa 15.000 VND) và `WELCOME5000` giảm 5.000 VND (đơn tối thiểu 30.000 VND).

`GET /inventory` tính số ly tối đa của mỗi món và size theo định lượng giới hạn nhất trong công thức; phản hồi bổ sung `recipeConfigured` để phân biệt món chưa có công thức với món hết nguyên liệu. Web làm mới dữ liệu tồn kho mỗi 10 giây khi trang hiển thị và khi người dùng quay lại.

`POST /orders/preview` nhận cùng cấu trúc `items`, `promoCode`, `redeemPoints` và dùng chung hàm định giá với `POST /orders`. API cộng nhu cầu của mọi dòng theo từng nguyên liệu và trả `inventory.available`, `inventory.shortages` cùng `inventory.unconfiguredProducts`; bước preview chỉ đọc tồn kho, không giữ kho, tạo đơn, tăng lượt dùng mã hay trừ điểm. Giỏ hàng chạy lại preview khi thay đổi và định kỳ khi đang mở. `POST /orders` tính lại toàn bộ giá và nhu cầu trong transaction; nếu thiếu nguyên liệu hoặc bước lưu đơn thất bại, toàn bộ thay đổi kho được rollback. Preview không đảm bảo kho/khuyến mãi vẫn còn đến lúc đặt.

Topping được gửi theo `toppings: [{ id, quantity }]` trên từng dòng hàng; tất cả topping đang bật áp dụng toàn menu, không cấu hình từng sản phẩm-size và không có quota thủ công. Backend cộng nhu cầu nguyên liệu topping với toàn bộ giỏ, giới hạn bằng tồn kho thực tế, rồi kiểm tra/tiêu hao trong cùng lượt preview/transaction với nguyên liệu và vật tư. Khi hủy đơn đủ điều kiện, backend hoàn theo snapshot đã lưu lúc tạo đơn, không tính lại theo công thức hiện tại. Quy tắc bao bì chưa cấu hình thì không tiêu hao; khi đã cấu hình, thiếu hoặc không đủ vật tư sẽ chặn đơn.

Topping liên kết trực tiếp tới một nguyên liệu làm nguồn tồn kho duy nhất; định lượng một phần dùng chung được lưu trên topping và số phần khả dụng là `FLOOR(tồn / định lượng)`. Ly được khai báo tại tab Kho vật tư với nhóm `CUP` (hoặc `LY`) và size tương thích; hệ thống tiêu hao ly tương ứng tự động cho mọi đồ uống cùng size, không cần thêm ly vào từng công thức.

`POST /payments` nhận JSON dạng `{"orderId":"<UUID>","method":"WALLET"}`; `method` hỗ trợ `WALLET` và `CARD`. Bắt buộc gửi header `Idempotency-Key` có 8–128 ký tự ASCII in được. API lấy số tiền từ đơn đã lưu, không nhận `amount` từ client, đồng thời chỉ cho chủ đơn thanh toán. Dùng lại key cùng payload trả kết quả đã lưu; cùng key với payload khác trả `409 Conflict`. API trả `SUCCESS`/`PAID` hoặc `FAILED`/`PAYMENT_FAILED` trong HTTP 201. Body chỉ được gửi `"simulateFailure":true` khi `PAYMENT_DEMO_ENABLED=true`; production mặc định tắt lựa chọn này.

Ví dụ response thanh toán thành công:

```json
{
  "paymentId": "UUID",
  "orderId": "UUID",
  "method": "WALLET",
  "status": "SUCCESS",
  "orderStatus": "PAID",
  "amount": 75000,
  "loyaltyPoints": 75,
  "pointsEarned": 75,
  "message": "Thanh toán mô phỏng thành công",
  "provider": "MOCK",
  "qrPayload": "BREWLITE-DEMO://wallet?..."
}
```

Khi mock thất bại, response có `status: "FAILED"` và `orderStatus: "PAYMENT_FAILED"`; đây là kết quả mô phỏng trả HTTP 201, không phải lỗi HTTP. `paymentId` và `orderId` thực tế là UUID do hệ thống tạo/lưu.

Mọi đơn mới bắt đầu ở `PENDING` và giữ chỗ tồn kho trong PostgreSQL. `PaymentProvider` hiện chỉ có adapter `MOCK`; QR hiển thị trên trang checkout chỉ mã hóa payload demo và không kết nối ứng dụng ngân hàng, không xác nhận giao dịch và không thu tiền. Để bật checkbox giả lập thất bại trong môi trường local, đặt `PAYMENT_DEMO_ENABLED=true` trong `.env` rồi tạo lại API: `docker compose up -d --build api`. Không bật chế độ này ở production.

State machine cho phép `PENDING → PAID/PAYMENT_FAILED/CANCELLED`, `PAYMENT_FAILED → PENDING/CANCELLED`, `PAID → PREPARING/CANCELLED`, `PREPARING → READY`, `READY → COMPLETED`. Nhân viên chỉ có thể hủy các trạng thái có cạnh chuyển hợp lệ; không thể hủy đơn đang pha chế/đã hoàn thành/đã hủy. Lệnh hủy giữ đơn trong database, hoàn nguyên liệu theo snapshot, hoàn điểm đã dùng/thu hồi điểm thưởng nếu có và giảm lượt dùng mã đúng một lần; **không hoàn tiền**. Công thức mẫu gồm cà phê sữa: 18g hạt + 120ml sữa đặc; bạc xỉu: 18g hạt + 80ml sữa tươi; trà đào cam sả: 20g trà + 10g sả. Sữa đặc được tạo với tồn ban đầu bằng 0; nhân viên cần nhập tồn trước khi bán cà phê sữa. Định lượng là dữ liệu giả định phục vụ demo; cần thay bằng công thức và tồn thực tế trước khi vận hành.

## 8. Hướng dẫn sử dụng

1. Mở Menu tại trang chủ và chọn một sản phẩm để xem chi tiết.
2. Chọn size và topping; tổng giá được cập nhật theo tùy chọn.
3. Thêm sản phẩm vào giỏ. Có thể mở giỏ từ Header; cart được lưu trong trình duyệt.
4. Trong giỏ, tăng/giảm số lượng hoặc xóa sản phẩm.
5. Đăng ký hoặc đăng nhập để tiếp tục tạo đơn.
6. Áp dụng mã giảm giá và điểm trong giỏ; xem ngay tạm tính, từng khoản giảm và tổng cần thanh toán. Giá được preview từ backend rồi tính lại khi tạo đơn.
7. Gửi đơn từ giỏ hàng; API lưu đơn ở trạng thái `PENDING` và chuyển sang bước thanh toán.
8. Chọn Ví điện tử hoặc Thẻ, rồi nhấn **Thanh toán [số tiền]** để vào trạng thái chờ. QR demo chỉ xuất hiện ở bước này. Nhấn **Xác nhận thanh toán mô phỏng** để gọi API; thành công chuyển đơn sang `PAID`, thất bại chuyển sang `PAYMENT_FAILED`.
9. Khi thanh toán thất bại, giỏ được giữ và có thể thử lại trên cùng Order ID. API lỗi chỉ hiển thị trạng thái chưa xác định, không tự báo thành công.
10. Tải lại trang không tự tạo đơn hoặc gửi thanh toán. Đơn chờ thanh toán và JWT được lưu trong `sessionStorage` của tab; JWT được xác minh lại qua `GET /auth/me` trước khi khôi phục quyền.
11. Mở mục Đơn hàng ở Header hoặc trang Tài khoản để xem lịch sử; chọn một đơn để xem chi tiết và lần thanh toán mới nhất.
12. Điểm thưởng được cộng theo 1 điểm/1.000 VND thanh toán thành công; có thể đổi điểm tại giỏ theo tỷ lệ 100 VND/điểm. Hủy đơn hoàn điểm đã dùng.
13. Nhân viên đăng nhập tại `/staff/login`; chỉ tài khoản STAFF mới được cấp quyền vào `/staff`. Sidebar có `/staff/orders` (lọc/tìm/phân trang; mục riêng đã hoàn thành/đã hủy; chuyển trạng thái hoặc hủy đơn theo điều kiện), `/staff/ingredients` (quản lý kho, điều chỉnh có lý do và công thức), `/staff/promotions` và `/staff/account`. JWT/role được xác minh lại qua Backend; API tiếp tục bảo vệ bằng `StaffGuard`. Đăng ký công khai chỉ cấp role `CUSTOMER`.

Schema Task 10 được mở rộng bằng migration `1710000003000-Task10BusinessRules.ts` và `1710000004000-RedemptionAndPromotionRules.ts`. Nâng cấp nguyên liệu bổ sung migration `1710000005000-CreateIngredientInventory.ts`; migration cũ không bị sửa. Schema lưu versioned stock, recipe, snapshot tiêu hao nguyên liệu theo đơn và lịch sử điều chỉnh; database tự áp migration khi API khởi động. Không xóa database hoặc Docker volume để chạy migration.

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
npm run test:e2e -- --runInBand
npm run build
```

`test:e2e` chạy các kiểm thử PostgreSQL thật khi bật rõ ràng `TEST_DB_ALLOW_MUTATIONS=1` và cung cấp `TEST_DB_NAME`/`TEST_DB_PASSWORD`; nếu thiếu các biến này, suite tích hợp được skip an toàn. Dùng database test riêng, không trỏ suite vào database có dữ liệu cần giữ. Ví dụ tạo PostgreSQL tạm không gắn volume:

```powershell
$testPassword = [guid]::NewGuid().ToString("N")
docker run --rm -d --name brewlite-feature-test-db `
  -e POSTGRES_USER=task10 `
  -e POSTGRES_PASSWORD=$testPassword `
  -e POSTGRES_DB=brewlite_task10_test `
  -p 127.0.0.1:55433:5432 postgres:17

$env:TEST_DB_ALLOW_MUTATIONS = "1"
$env:TEST_DB_HOST = "127.0.0.1"
$env:TEST_DB_PORT = "55433"
$env:TEST_DB_USER = "task10"
$env:TEST_DB_PASSWORD = $testPassword
$env:TEST_DB_NAME = "brewlite_task10_test"
npm run test:e2e -- --runInBand
```

Chờ PostgreSQL sẵn sàng bằng `docker exec brewlite-feature-test-db pg_isready -U task10 -d brewlite_task10_test`. Sau khi chạy xong, dừng riêng container test bằng `docker stop brewlite-feature-test-db`; `--rm` sẽ dọn container tạm, không có Docker volume. Không dùng database/volume phát triển để chạy integration test.

Để bật checkbox giả lập thanh toán thất bại cục bộ, đặt biến trong `.env`:

```powershell
$env:PAYMENT_DEMO_ENABLED = "true"
Set-Location apps/api
npm run start:dev
```

Mặc định `PAYMENT_DEMO_ENABLED=false`; backend từ chối payload giả lập thất bại nếu cấu hình đang tắt. Thanh toán vẫn dùng mock provider và không thu tiền thật. QR chỉ là dữ liệu demo, không thể dùng để thanh toán ngân hàng.

CI tại `.github/workflows/ci.yml` chạy khi có pull request vào `main`. Hai job Web và API lần lượt cài dependencies bằng `npm ci`, chạy lint, unit test và build với Node.js 24. CI không chạy integration test cần PostgreSQL riêng; chạy suite này theo hướng dẫn ở trên.

Trước Task 9, Web lint, TypeScript và build đạt; **14/14** unit tests trong 4 file đạt. API lint, TypeScript và build đạt; **37/37** unit tests trong 8 suite đạt. Kiểm tra trực tiếp trên PostgreSQL 17 cho Task 8 xác nhận migration và bảng `payments`; đã thử Wallet/Card thành công, mock thất bại, DTO/method sai, JWT thiếu/sai, đơn không tồn tại/không thuộc user/đã PAID, số tiền gửi thêm bị từ chối, request đồng thời cho kết quả HTTP `201` và `409`, và rollback khi cố ý làm lỗi bước cập nhật đơn. Dữ liệu user/order tạo riêng cho kiểm tra đã được xóa sau đó; dữ liệu trước đó được giữ nguyên.

Trong lần triển khai Task 9: Web lint, TypeScript, build đạt và **15/15** unit tests trong 4 file đạt; API typecheck, lint, build đạt và **39/39** unit tests trong 8 suite đạt. `docker compose config --quiet` và build/run toàn stack đạt; DB, API, Web đều healthy trên cổng lần lượt `5433`, `3003`, `3002`. Smoke test đăng ký/đăng nhập, tạo đơn 2 dòng hàng HTTP `201` với `PENDING` và tổng backend `141.000 VND`, đọc lịch sử/chi tiết, từ chối user khác với HTTP `404`, và xác nhận `1` order/`2` order items/tổng `141000` trực tiếp trong PostgreSQL. Trình duyệt xác nhận luồng tạo đơn → lịch sử → chi tiết; ở mobile viewport document không tràn ngang và các link Đơn hàng/Giỏ hàng còn trong vùng nhìn. Dữ liệu kiểm thử riêng đã được xóa; volume DB cũ vẫn còn nguyên.

Kiểm thử giao diện trên trình duyệt xác nhận đăng ký/đăng nhập → Menu/chi tiết → giỏ hàng → tạo đơn → Card mô phỏng thành công, hiển thị `PAID` và xóa cart. Màn hình thất bại được kiểm tra với response giả lập ở trình duyệt; API failure thật được kiểm tra riêng với PostgreSQL bằng `PAYMENT_DEMO_ENABLED=true`. Tải lại trang checkout không tự gửi lại request thanh toán; tại viewport mobile nội dung không tràn ngang.

Kiểm tra thay đổi giao diện và pricing preview: API build/lint và **55/55 unit tests** đạt; PostgreSQL 17 biệt lập **12/12 integration tests** đạt, bao gồm preview coupon/điểm không làm thay đổi dữ liệu, hàng đợi staff và thống kê trạng thái. Web TypeScript/lint/build và **22/22 unit tests** đạt; bộ test bao gồm role-based redirect, StaffShell, preview coupon/điểm và checkout theo bước QR. Docker Compose cấu hình hợp lệ, ba dịch vụ healthy; smoke test Web và API công khai đạt, các API preview/staff từ chối request không JWT bằng `401`. Database hiện hữu trước/sau rebuild giữ nguyên số bản ghi kiểm tra (2 user, 17 orders, 23 order items, 10 payments, 3 inventory rows). Trình duyệt xác nhận `/staff/orders` chưa đăng nhập được chuyển đến login và trang giỏ ở mobile viewport không tràn ngang; StaffShell xác minh role được kiểm tra thêm qua unit test.

Kiểm tra nâng cấp sau Task 10 (10/11/2026): API lint/build và **55/55 unit tests** đạt; PostgreSQL 17 tạm biệt lập chạy **18/18 integration tests**, gồm tiêu hao/hoàn nguyên liệu, chống bán vượt tồn đồng thời, audit điều chỉnh, recipe bắt buộc, state machine và lịch sử đơn đã hoàn thành/đã hủy. Web lint/TypeScript/build đạt và **29/29 unit tests**; có test cổng STAFF riêng, CUSTOMER bị từ chối, return URL checkout, quản lý công thức và thao tác hủy/lọc lịch sử. Migration `1710000005000-CreateIngredientInventory` đã áp trên Docker Compose hiện có; các bảng cũ giữ nguyên số dòng (2 users, 22 orders, 31 order items, 15 payments, 3 product inventory), đồng thời tạo 4 nguyên liệu, 6 công thức và bảng audit mới. Cả ba dịch vụ Compose healthy; HTTP smoke test `/products` và hai route Staff trả `200`, API `/ingredients` thiếu JWT trả `401`. Trình duyệt xác nhận `/staff/login` hiển thị giao diện độc lập và truy cập `/staff/ingredients` khi chưa đăng nhập chuyển về cổng Staff login. Không xóa database/volume.

Kiểm tra thiết kế lại kho (10/11/2026): API **68/68 unit tests**, Web **37/37 unit tests**, API/Web build và lint đều đạt. PostgreSQL Compose đã áp migration `1710000010000-LinkExistingToppingsToIngredients`; `/inventory`, topping và Staff workspace trả HTTP 200; dữ liệu cũ giữ nguyên (3 users, 25 orders, 30 order items). Ba topping hiện được nối lần lượt tới `CREAM_CHEESE` (g), `ESPRESSO` (ml), `PEARLS` (g), giữ giá và lượng tồn hiện hữu; chưa đặt liều mỗi phần hay bật bán. Không có công thức espresso từ hạt cà phê nên không tự suy diễn tỷ lệ. Integration test cần DB tách biệt được biên dịch nhưng bỏ qua có chủ đích khi `TEST_DB_ALLOW_MUTATIONS=0`.

Kiểm tra yêu cầu topping toàn menu: cấu hình topping đã bật tại Kho topping tự áp dụng cho mọi sản phẩm-size hiện có và tương lai; công thức đồ uống không còn cần thêm topping từng size. Số phần khách chọn không bị giới hạn bởi recipe, nhưng vẫn bị giới hạn và kiểm tra theo tồn kho nguyên liệu dùng chung trong preview/transaction đặt hàng. Trang công thức chỉ hiển thị danh sách topping toàn menu; các quy tắc topping sản phẩm-size cũ được giữ lại nhưng không còn điều khiển khả dụng.

## 10. Tiến độ Assignment 1

| Task | Hạng mục | Tiến độ |
|---|---|---|
| 1 | Khởi tạo dự án | Đã triển khai |
| 2 | API sản phẩm | Đã triển khai |
| 3 | Trang Menu | Đã triển khai |
| 4 | Chi tiết và tùy chọn sản phẩm | Đã triển khai |
| 5 | Giỏ hàng | Đã triển khai |
| 6 | API tạo đơn hàng | Đã triển khai |
| 7 | Đăng ký, đăng nhập và bảo vệ API | Đã triển khai; Staff có cổng `/staff/login`, Customer mặc định về Menu và giữ đường dẫn checkout hợp lệ |
| 8 | Thanh toán mock | Đã triển khai; kiểm tra kết quả test ở mục 9 |
| 9 | Xác nhận, lịch sử đơn và bàn giao | API/UI lịch sử và chi tiết đã triển khai, smoke-test đạt; bàn giao chưa triển khai |
| 10 | Nghiệp vụ Backend nâng cao | Đã triển khai state machine, idempotency PostgreSQL, inventory optimistic versioning, promotion và loyalty; unit/integration test đạt. |

Trạng thái phản ánh tính năng có trong mã nguồn và không xác nhận triển khai production. Xem thêm ghi chú giới hạn ở [mục 11](#11-các-giới-hạn-hiện-tại).

## 11. Các giới hạn hiện tại

- Danh sách sản phẩm chưa lưu trong PostgreSQL; API dùng catalog mẫu trong bộ nhớ.
- Phụ thu size và topping là cấu hình mẫu; chưa có quản trị giá hoặc đồng bộ từ backend với một nguồn dữ liệu giá tập trung.
- JWT có thời hạn 15 phút, được lưu trong `sessionStorage` của tab để hỗ trợ reload và Staff UI xác minh lại qua `/auth/me`. Token trong Web Storage có thể bị lộ nếu ứng dụng có lỗ hổng XSS; logout phía client không thu hồi token đã phát trước khi token hết hạn.
- Thông tin đơn thanh toán cũng được giữ trong `sessionStorage` của tab; tải lại không tự gửi lại giao dịch.
- Thanh toán chỉ có mock provider. QR không kết nối ngân hàng, không xác minh giao dịch và không đại diện cho khoản tiền thật; kiểm thử lỗi chỉ khả dụng khi backend bật `PAYMENT_DEMO_ENABLED`.
- Không có refresh token hoặc thanh toán thật. Hủy đơn đã thanh toán không hoàn tiền thật; mock payment chỉ đổi trạng thái mô phỏng.
- Catalog/giá, công thức và tồn nguyên liệu khởi tạo là dữ liệu mẫu; cần nhập tồn/công thức thực tế và kiểm kê thường xuyên trước khi vận hành.
- Điều chỉnh tồn nguyên liệu ghi người thao tác, lượng thay đổi, lý do và thời gian; chưa có báo cáo kiểm kê, nhà cung cấp, lô/hạn sử dụng hoặc quy trình duyệt điều chỉnh.
- Vai trò `STAFF` được cấp ngoài luồng bởi quản trị database; chưa có màn hình quản trị nhân viên hoặc phân quyền theo cửa hàng.
- CORS mặc định cho phép hai origin local `http://localhost:3000` và `http://localhost:3002`; cần cấu hình phù hợp trước khi triển khai.
- Docker Compose chạy được PostgreSQL, API và Web trong môi trường local; cấu hình hiện chưa phải cấu hình production.

## 12. Hướng phát triển tiếp theo

- Hoàn thiện quy trình xác nhận nhận hàng/bàn giao và thông báo khách hàng.
- Thay catalog/giá/công thức mẫu bằng cấu hình nghiệp vụ có nguồn quản trị đáng tin cậy.
- Bổ sung hoàn tiền thực, quản lý lô/hạn sử dụng, nhà cung cấp, báo cáo kiểm kê và phân quyền nhân viên theo cửa hàng.
