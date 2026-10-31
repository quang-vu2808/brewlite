# TASK 3.1 – PHƯƠNG PHÁP VÀ QUYẾT ĐỊNH KIẾN TRÚC BREWLITE


## 1. Tổng quan và quyết định đề xuất

BrewLite cho phép khách xem menu → tùy chọn size/topping → giỏ → xác thực → tạo đơn → thanh toán Ví/Thẻ mô phỏng → xác nhận và theo dõi. Đề Assignment 2 bắt buộc Next.js/PWA, NestJS, PostgreSQL; đề gốc có State Machine, idempotency, transaction + optimistic locking, khuyến mãi và loyalty. Phương án **Layered Architecture trong một Modular Monolith NestJS**, một Next.js web app và một PostgreSQL database phù hợp vì các nghiệp vụ đơn–tồn kho–thanh toán–điểm cần nhất quán, phạm vi học phần có nhân lực/thời gian hữu hạn, trong khi module hóa vẫn cho phép kiểm thử độc lập. Đây là **đề xuất**, không phải quyết định được giảng viên áp đặt.

```text
Customer browser/PWA → Next.js presentation → HTTPS/REST → NestJS API
                                                    │
                    Controllers + DTO/Guards + Application services
                                                    │
                Domain rules/modules (Auth, Product, Order, Payment,
                              Promotion, Loyalty)
                                                    │
       Repository/ORM + transactions + migrations → PostgreSQL
                             Payment adapter → Mock Payment Service
        Shared infrastructure: config, validation, logging, health, errors
```

**Ranh giới:** UI hỗ trợ hiển thị/tính nháp, Backend là nguồn sự thật cho giá, giảm giá, quyền truy cập, tổng tiền, tồn kho, chuyển trạng thái và Loyalty. Không gọi trực tiếp database hoặc mock payment từ trình duyệt. Monolith là **một tiến trình triển khai API có các module phân ranh**, không phải gom mọi nghiệp vụ vào một service khổng lồ.

## 2. Frontend – Next.js/PWA (Presentation)

- Trang menu và chi tiết sản phẩm: gọi `GET /products`, `GET /products/:id`; hiển thị loading/empty/error.
- Tùy chọn size/topping và giỏ hàng: quản lý trạng thái giao diện, cho khách xem tổng **ước tính**; không dùng giá do client gửi làm giá cuối cùng.
- Đăng ký/đăng nhập, checkout, xác nhận, lịch sử/trạng thái: gọi API; chỉ hiển thị kết quả thanh toán do Backend trả.
- Mobile-first và PWA, thiết kế responsive; cache tài nguyên giao diện nếu cấu hình, **không cache trạng thái thanh toán thành công như chân lý**. Dự kiến dùng TypeScript; lựa chọn thư viện state cụ thể chờ nhóm chốt.
- Trình duyệt chỉ lưu thông tin cần thiết; tránh log JWT và dữ liệu nhạy cảm. Cách lưu token (cookie HttpOnly hay giải pháp khác) phải được thống nhất cùng cơ chế CSRF/CORS ở ADR-005.

## 3. Backend – Layers và module/domain

| Thành phần | Trách nhiệm và dữ liệu | Tương tác chính |
|---|---|---|
| Controller/DTO/Guards (API layer) | REST endpoint, validate input, xác thực/ủy quyền, chuyển mã lỗi HTTP; không chứa transaction nghiệp vụ dài | Gọi application services |
| Auth module | Đăng ký, hash mật khẩu, login/JWT và quyền truy cập; `User` | Order, History |
| Product module | Menu, cấu hình size/topping, giá chuẩn, tồn kho/version của `Product` | Cart/Order |
| Cart (frontend state + backend validation) | Giỏ là lựa chọn của khách; không tin client price; **không mặc nhiên có Cart table** | Product, Order |
| Order module | `Order`, `OrderItem`, tính snapshot giá, transaction tạo đơn/cập nhật/giữ tồn, State Machine | Product, Promotion, Payment, Loyalty |
| Payment module | `Payment`, kiểm tra key/idempotency, gọi payment port/adapter, ghi nhận kết quả và chuyển trạng thái hợp lệ | Order, mock adapter |
| Promotion module | `Promotion`, hiệu lực/điều kiện/giá trị giảm; không trực tiếp phát lệnh thu tiền | Order |
| Loyalty module | `LoyaltyTransaction`, điểm khi PAID, uniqueness theo order để không cộng lặp | Payment/Order, User |
| Infrastructure | Repositories/ORM, PostgreSQL, migrations, mock adapter, logging, config, health | Các application service qua interface/port khi cần |

**Nguyên tắc dependency:** Controller → application service → domain policy → repository/payment abstraction; implementation hạ tầng không được là nơi duy nhất lưu quy tắc nghiệp vụ. Shared utility không được tự tiện import ngược các module domain. Order điều phối checkout; Payment không tự tạo Order mới khi retry.

**Đề xuất cấu trúc (chưa tạo code):** `apps/api/src/{auth,products,orders,payments,promotions,loyalty,common,config,health}`; mỗi module có controller/application/domain/infrastructure theo độ phức tạp thực tế. Entity domain không đồng nghĩa 1:1 với database table hoặc bắt buộc có controller riêng.

## 4. Data access, migration, giao dịch và tồn kho

- PostgreSQL lưu `User`, `Product`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction`; đối chiếu chính xác thuộc tính/quan hệ/multiplicity với **Class Diagram được duyệt** trước khi khóa migration. Có thể thêm bảng/bản ghi idempotency hoặc reservation theo chính sách được duyệt; không tự coi là Class Diagram đã xác nhận.
- Migration là file phiên bản bất biến được commit, chạy tuần tự tại local/test/prod; seed dữ liệu mẫu tách migration cấu trúc; thử migration trên DB thử nghiệm và có backup/rollback phù hợp trước triển khai. ORM đề xuất Prisma, TypeORM là phương án thay thế; chưa khóa công cụ trước khi nhóm duyệt ADR-003.
- Một transaction ngắn ở UC-18 M5: kiểm tra giỏ bằng dữ liệu tin cậy; cập nhật tồn kho với điều kiện version và đủ số lượng, tạo Order/OrderItems `PENDING`, snapshot giá/giảm; khi xung đột hoặc lỗi thì rollback toàn bộ. Optimistic locking bằng cột `version` hoặc cập nhật có điều kiện tương đương; kiểm tra row affected; có test hai yêu cầu cùng tranh một hàng tồn.
- **Không giữ DB transaction trong khi gọi Mock Payment Service.** M7–M9 dùng bản ghi có khóa duy nhất cho key và state cập nhật nguyên tử để tránh nhân đôi Payment hoặc Loyalty. Quyết định tồn kho bị giữ/trừ/giải phóng khi PAYMENT_FAILED, CANCELLED, timeout **chưa được nhóm duyệt**, không được viết vào code như một sự thật đã chốt.

## 5. Mock Payment và luồng UC-18

1. Order kiểm tra JWT và giỏ, tính giá server-side, áp mã hợp lệ khi có; transaction tạo `PENDING` và xử lý tồn kho; trả mã đơn.
2. Payment nhận order/method Ví hoặc Thẻ + `Idempotency-Key`; xác minh chủ đơn, trạng thái hợp lệ, amount snapshot, fingerprint request và khóa duy nhất. Cùng key/payload trả kết quả trước; cùng key/khác payload bị từ chối **theo phương án đề xuất**. Một key đang xử lý/timeout phải được đối soát, không phát gọi thu tiền mới tùy tiện.
3. Qua adapter, gọi **Mock** Payment Service, không có giao dịch tiền thật. Thành công: ghi Payment và transition `PENDING → PAID`, tạo LoyaltyTransaction **một lần**; thất bại: `PAYMENT_FAILED`, không cộng điểm, giữ giỏ. Retry thật sau thất bại phải tuân State Machine và dùng key mới nhưng **không tạo Order thứ hai**.
4. Các thay đổi status khác phải qua hàm guard/assertTransition, từ chối transition không hợp lệ. Giữ audit log không chứa secret. Nếu phần hậu thanh toán lỗi, khôi phục an toàn theo trạng thái đã lưu, không thanh toán lại để “sửa” Loyalty.

**Cần nhóm chốt:** chi tiết khóa idempotency/thời gian lưu, timeout/reconciliation, công thức khuyến mãi và Loyalty, tồn kho khi thất bại/hủy. Đây là chính sách chưa ấn định trong hai PDF và đã ghi là đề xuất trong SRS/UC-18.

## 6. Cross-cutting concerns

| Chủ đề | Thiết kế đề xuất và vị trí |
|---|---|
| Auth/JWT | Auth service cấp token, NestJS guard bảo vệ route đặt đơn/thanh toán/lịch sử; kiểm tra ownership; hash mật khẩu |
| Validation | DTO + class-validator ở API boundary, business invariant kiểm tra lại trong domain; FE validate chỉ để tăng trải nghiệm |
| Error handling | Global exception filter; mã lỗi ổn định; không trả stack trace/secret; map lỗi validate/unauthorized/conflict/payment timeout |
| Logging | Structured logs có request/correlation id, event và status; che JWT, mật khẩu, secret; audit chuyển trạng thái, key dưới dạng tham chiếu an toàn |
| Health | Endpoint `GET /health` trả tình trạng tiến trình và mức kết nối cần thiết; không công khai secret; phân biệt liveness/readiness nếu nền tảng hỗ trợ |
| Configuration | `.env.example` chỉ chứa tên biến và mẫu không nhạy cảm; kiểm tra biến bắt buộc khi khởi động; secret từ môi trường/CI, không commit hoặc in log |
| Testability | Unit domain (state/promotion/loyalty), integration DB/API (transaction, idempotency), E2E menu → checkout; inject mock adapter để kiểm soát kết quả |

## 7. Đánh đổi và phương án thay thế

| Tiêu chí | Modular Monolith phân lớp (đề xuất) | Microservices tách Order/Payment/...) |
|---|---|---|
| Phức tạp vận hành | Một API deploy, một DB; phù hợp nhóm sinh viên | Service discovery/network, nhiều deploy, quan sát phân tán |
| Nhất quán dữ liệu | Transaction local thuận lợi cho tạo đơn/tồn kho | Phải điều phối giao dịch phân tán/eventual consistency |
| Tính module và test | Phân tách trong code, test domain độc lập nhưng phải giữ ranh giới import | Cô lập deploy tốt hơn nhưng hợp đồng mạng/test tích hợp phức tạp |
| Khả năng mở rộng | Scale cả API; dễ phát sinh phụ thuộc module nếu thiếu kỷ luật | Scale thành phần riêng, đổi lại overhead hạ tầng |
| Phù hợp thời gian | Tập trung đạt FR-15–FR-19, CI/CD và demo | Rủi ro vượt thời gian/ngân sách học phần |

**Hạn chế cần thừa nhận:** một lỗi nghiêm trọng trong API có thể ảnh hưởng toàn bộ monolith; triển khai backend phải đồng bộ, database chung có thể tăng coupling. Giảm rủi ro bằng interface rõ, test, module ownership, code review; không tuyên bố microservices “sai” hoặc monolith tự động đạt hiệu năng tốt.

## 8. Truy vết yêu cầu – thiết kế – UML (cần so khớp Task 2 thực tế)

| Thành phần | FR/NFR từ SRS đã đọc | UML cần xác minh trong Task 2 | Giải thích |
|---|---|---|---|
| Next.js/menu/cart | FR-01–FR-06; NFR-05, NFR-06 | Activity chọn sản phẩm/giỏ; Sequence checkout | Giao diện, trạng thái và tính nháp; backend chốt giá |
| Auth | FR-07–FR-08; NFR-02–NFR-04 | Sequence UC-18 bước JWT; Class User | Guard, hash, owner check |
| Order | FR-09, FR-12–FR-15; NFR-04 | Activity checkout; Sequence transaction; Class Order, OrderItem | Tạo đơn và State Machine |
| Product/inventory | FR-02–FR-03, FR-17 | Sequence cạnh tranh tồn kho; Class Product | Transaction và optimistic locking |
| Payment/mock | FR-10–FR-11, FR-16 | Sequence payment + alt; Class Payment | Adapter, idempotency, cập nhật kết quả |
| Promotion | FR-18 | Activity nhánh mã giảm; Class Promotion | Tính giảm hợp lệ trên server |
| Loyalty | FR-19 | Sequence hậu PAID; Class LoyaltyTransaction | Cộng điểm một lần |
| PostgreSQL/migrations | FR-09, FR-16–FR-19; NFR-07 | Class và Sequence tạo đơn | Tính bền vững, khóa, transaction, seed/migration |
| Logging/health/config/CI | NFR-08–NFR-10, NFR-09 | Deployment ở Task 3.2 **chưa thực hiện** | Quan sát và bàn giao |

**Chưa xác minh được:** tên tệp và nội dung Activity, Sequence, Class Diagram đã duyệt trên GitHub; không được tự đánh dấu phần tương thích UML là đạt. Khi nhận sơ đồ, đối chiếu: state transitions, thời điểm trừ tồn/rollback, Payment uniqueness, quan hệ Order–OrderItem, Promotion/Loyalty, và actors/lifelines của UC-18. Nếu lệch, mở GitHub Issue, cập nhật tài liệu qua PR có ghi lý do.

## 9. Quyết định còn chờ duyệt và giới hạn tài liệu

- ADR-001 đến ADR-006 đều **Proposed**, chưa là Accepted.
- Chốt ORM, định dạng token/cookie và CSRF, interface Mock, chính sách tồn kho failed/cancelled/timeout, key retention, khuyến mãi/loyalty; kiểm tra chính xác bản Task 1–2 nhóm duyệt.
- Task 3.2 mới xác nhận nền tảng production, container registry, networking/secret và vẽ Deployment Diagram; **không được mô tả kiến trúc đề xuất này như hệ thống đã triển khai**.

## 10. Liên kết ADR

- [ADR-001 Monorepo](adr/001-monorepo.md)
- [ADR-002 Layered Modular Monolith](adr/002-layered-architecture.md)
- [ADR-003 PostgreSQL/Migrations](adr/003-database-migration.md)
- [ADR-004 Mock Payment](adr/004-mock-payment.md)
- [ADR-005 Authentication/JWT](adr/005-authentication-jwt.md)
- [ADR-006 Config/Observability](adr/006-configuration-observability.md)
