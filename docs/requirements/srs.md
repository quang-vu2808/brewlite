# TASK 1.2 – ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS RÚT GỌN)

**Dự án:** BrewLite – Ứng dụng đặt và thanh toán đồ uống không dùng tiền mặt  
**Học phần:** Công nghệ Phần mềm – Trường Đại học Sài Gòn  
**Phiên bản:** 0.2 – Bản hiệu chỉnh, chờ nhóm phê duyệt  
**Trạng thái:** Đã chuẩn hóa nội dung và định dạng; các quyết định ở Mục 8 là đề xuất, chưa được nhóm phê duyệt  
**Tài liệu nền:** `docs/requirements/context-and-scope.md` (Task 1.1); BrewLite gốc, mục 3–5, 8–9, 12; Assignment 2, mục 1.1, 3.2, 4–7.

## 1. Giới thiệu

Tài liệu xác định các yêu cầu chức năng (FR) và phi chức năng (NFR), mức ưu tiên MoSCoW và tiêu chí chấp nhận có thể kiểm chứng của BrewLite. Đây là cơ sở cho Use Case Diagram tổng quát, đặc tả Use Case trọng tâm, thiết kế, lập trình và kiểm thử. Một yêu cầu được xem là đáp ứng khi các tiêu chí chấp nhận tương ứng đạt trong môi trường thử nghiệm được mô tả. Mã FR/NFR trong tài liệu là mã **đề xuất của nhóm** (hai PDF không cấp sẵn bộ mã cố định).

**Quy ước nguồn:** **[Đề]** = nội dung được yêu cầu trong ít nhất một PDF; **[Cụ thể hóa]** = cách diễn đạt/quy tắc kiểm chứng do nhóm đề xuất để triển khai nội dung đề; **[Mở rộng]** = tính năng bổ sung không bắt buộc. Các con số, quy tắc chi tiết bổ sung cần nhóm thống nhất trước khi khóa phiên bản SRS.

## 2. Mục tiêu và phạm vi hệ thống

BrewLite giúp khách xem menu, chọn size/topping, quản lý giỏ, đăng nhập, đặt đơn, thanh toán Ví/Thẻ **mô phỏng**, nhận xác nhận và theo dõi trạng thái/lịch sử đơn. Luồng tối thiểu: **Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn**. MVP hoàn chỉnh bao gồm cả nghiệp vụ Backend liên quan được đề gốc yêu cầu; việc triển khai được phân kỳ qua hai Sprint theo Assignment 2.

**Liên kết Task 1.1:** IS-01–IS-10 thuộc phạm vi thực hiện; EX-01–EX-03 là mở rộng; OS-01–OS-05 ngoài bản bàn giao. Các mã IS/EX/OS dưới đây tham chiếu bản Task 1.1 đã soạn trước đó, **cần đối chiếu với phiên bản thực tế trên máy nếu nhóm đã chỉnh sửa**. Nhân viên quầy là stakeholder, nhưng giao diện nhân viên chuyên biệt được đề xuất để ở extension; nghiệp vụ lưu/kiểm soát trạng thái và khả năng theo dõi đơn vẫn thuộc MVP. Không có giao dịch tiền thật, giao hàng/định vị tài xế, hệ thống đa chi nhánh, ứng dụng native hay kế toán/đối soát ngân hàng thực tế.

## 3. Yêu cầu chức năng (Functional Requirements)

Mỗi dòng AC là một tiêu chí kiểm chứng; các ngưỡng/quy tắc bổ sung được ghi là **[Cụ thể hóa]**. `Must` phản ánh yêu cầu bắt buộc của hai đề, kể cả Task 10 đề gốc, không đồng nghĩa tất cả đều làm ngay ở Sprint 1.

| Mã | Tên / Phạm vi | Mô tả yêu cầu | MoSCoW | Tiêu chí chấp nhận (AC) | Nguồn |
|---|---|---|---|---|---|
| FR-01 | Xem menu / IS-01 | Hệ thống hiển thị danh sách đồ uống có tên, giá, hình ảnh. | Must | GET `/products` trả danh sách JSON; trang menu hiển thị đúng tên/giá/ảnh từ API; có trạng thái loading, empty, error. | [Đề] |
| FR-02 | Chi tiết sản phẩm / IS-02 | Khách xem thông tin một sản phẩm đã chọn. | Must | GET `/products/:id` trả đúng sản phẩm; mã không tồn tại trả lỗi thích hợp và giao diện thông báo, không hiển thị nhầm sản phẩm. | [Đề] + [Cụ thể hóa] |
| FR-03 | Size và topping / IS-02 | Khách chọn size S/M/L và topping; hệ thống xác định giá tương ứng. | Must | Chọn từng size/topping cập nhật lựa chọn và giá trên màn hình; khi đưa vào giỏ lưu đúng tùy chọn và đơn giá đã tính. | [Đề] |
| FR-04 | Thêm vào giỏ / IS-03 | Khách thêm cấu hình đồ uống vào giỏ hàng. | Must | Một cấu hình hợp lệ thêm thành công; giỏ hiển thị sản phẩm, size, topping, số lượng và thành tiền tương ứng. | [Đề] |
| FR-05 | Sửa/xóa giỏ / IS-03 | Khách thay đổi số lượng hoặc xóa dòng hàng. | Must | Số lượng hợp lệ được cập nhật; xóa dòng thì dòng không còn trong giỏ; không chấp nhận số lượng âm hoặc bằng 0 như một cập nhật số lượng thông thường [Cụ thể hóa]. | [Đề] + [Cụ thể hóa] |
| FR-06 | Tổng tiền / IS-03 | Hệ thống tự tính tổng theo sản phẩm, lựa chọn và số lượng; phản ánh khuyến mãi hợp lệ nếu áp dụng. | Must | Mỗi lần thay đổi giỏ, tổng được tính lại; tổng các dòng và khoản giảm (nếu có) khớp số tiền hiển thị trước xác nhận đơn. | [Đề] + [Cụ thể hóa] |
| FR-07 | Đăng ký / IS-04 | Người dùng tạo tài khoản qua thông tin hợp lệ. | Must | POST `/auth/register` nhận dữ liệu hợp lệ và tạo tài khoản; từ chối email trùng, dữ liệu không hợp lệ; không lưu mật khẩu dạng rõ. | [Đề] + [Cụ thể hóa] |
| FR-08 | Đăng nhập JWT / IS-04 | Người dùng đăng nhập, nhận JWT để truy cập chức năng được bảo vệ. | Must | POST `/auth/login` cấp JWT khi đúng thông tin; sai thông tin không cấp token; API đặt đơn từ chối truy cập không có JWT hợp lệ. | [Đề] |
| FR-09 | Tạo đơn / IS-05 | Tạo đơn từ giỏ hợp lệ sau xác thực, lưu chi tiết/tổng tiền và mã đơn. | Must | POST `/orders` kiểm tra JWT và dữ liệu; đơn hợp lệ được lưu ban đầu ở `PENDING`, có mã đơn và các dòng hàng; đơn không hợp lệ không tạo thành công. | [Đề] |
| FR-10 | Chọn phương thức thanh toán / IS-06 | Khách chọn Ví hoặc Thẻ trong cổng thanh toán mô phỏng. | Must | Màn hình cho chọn một trong hai phương thức; yêu cầu thanh toán mang đúng phương thức và số tiền của đơn, không thu tiền thật. | [Đề] |
| FR-11 | Kết quả thanh toán / IS-06 | Hệ thống xử lý thanh toán giả lập, cập nhật trạng thái tương ứng. | Must | POST `/payments`: mô phỏng thành công → `PAID`; thất bại → `PAYMENT_FAILED`, trả thông báo rõ; không báo thành công khi thực tế mock trả thất bại. | [Đề] |
| FR-12 | Xác nhận đơn / IS-07 | Hiển thị kết quả đặt/thanh toán cho khách. | Must | Sau thanh toán thành công, màn hình có mã đơn và trạng thái `PAID`; trường hợp thất bại hiển thị tình trạng tương ứng. | [Đề] |
| FR-13 | Lịch sử đơn / IS-07 | Khách xem những đơn của chính tài khoản. | Must | GET `/orders/me` chỉ trả về đơn của người dùng đã xác thực; hiển thị tối thiểu mã đơn, tổng tiền, trạng thái; tài khoản khác không đọc được lịch sử này. | [Đề] + [Cụ thể hóa] |
| FR-14 | Theo dõi trạng thái / IS-08 | Khách có thể xem trạng thái hiện tại của đơn. | Must | Mở thông tin đơn sẽ thấy trạng thái được lưu trong Backend; trạng thái hiển thị nhất quán với dữ liệu đơn. | [Đề] |
| FR-15 | Order State Machine / IS-08 | Backend chỉ cho phép chuyển trạng thái theo sơ đồ của đề gốc: `PENDING → PAID → PREPARING → READY → COMPLETED`, có nhánh lỗi/hủy hợp lệ. | Must | Chuyển hợp lệ thành công; chuyển không có trong sơ đồ bị từ chối và không làm đổi trạng thái; unit test kiểm chứng. `PAYMENT_FAILED` có thể thử lại theo sơ đồ đề gốc. | [Đề gốc Task 10] |
| FR-16 | Thanh toán idempotent / IS-09 | Backend dùng `Idempotency-Key` ngăn xử lý lặp thanh toán. | Must | Gửi hai yêu cầu cùng key cho cùng thao tác không tạo thêm đơn/thanh toán hoặc tính tiền lần hai; integration test chứng minh. | [Đề gốc Task 10]; Assignment 2 Task 2.2 |
| FR-17 | Kiểm soát tồn kho đồng thời / IS-09 | Backend kiểm tra tồn kho và dùng transaction cùng optimistic locking khi đặt đồng thời. | Must | Không cho đặt vượt số lượng tồn; khi có yêu cầu đồng thời vượt tồn, dữ liệu sau xử lý không âm và không bán quá số lượng có sẵn; có test đồng thời. | [Đề gốc Task 10]; Assignment 2 Task 2.2 |
| FR-18 | Khuyến mãi / IS-09 | Hệ thống áp dụng mã giảm giá hợp lệ theo điều kiện được thiết lập. | Must | Mã hợp lệ làm thay đổi tổng tiền đúng theo quy tắc đã cấu hình; mã không hợp lệ không được áp giảm; unit test cho cả hai nhánh. Quy tắc cụ thể cần nhóm chốt. | [Đề gốc Task 10] + [Cụ thể hóa] |
| FR-19 | Điểm thưởng / IS-09 | Hệ thống cộng điểm Loyalty khi đơn đạt trạng thái `PAID`. | Must | Đơn được thanh toán thành công nhận điểm đúng theo quy tắc đã cấu hình; đơn chưa `PAID` không được cộng; một đơn không bị cộng điểm trùng. Tỷ lệ điểm cần nhóm chốt. | [Đề gốc Task 10] + [Cụ thể hóa] |
| FR-20 | Giao diện Barista riêng / EX-01 | Nhân viên tiếp nhận và cập nhật đơn qua giao diện chuyên biệt. | Could | Nếu được triển khai: nhân viên có thể xem đơn và gửi yêu cầu chuyển trạng thái hợp lệ; hệ thống chặn chuyển trạng thái sai. Không phải điều kiện hoàn thành MVP theo phân định Task 1.1 đang chờ chốt. | [Mở rộng từ đề gốc] |
| FR-21 | Trang quản trị menu / EX-02 | Quản lý chỉnh sửa menu qua giao diện riêng. | Could | Nếu được triển khai: thay đổi được lưu và menu phản ánh dữ liệu mới; không ảnh hưởng các chức năng Must. | [Mở rộng đề xuất] |
| FR-22 | Thông báo chủ động / EX-03 | Gửi email/push khi trạng thái đơn thay đổi. | Could | Nếu được triển khai: một thay đổi trạng thái hợp lệ tạo thông báo mang đúng mã đơn/trạng thái. | [Mở rộng đề xuất] |
| FR-23 | Thanh toán tiền thật / OS-01 | Không tích hợp giao dịch tài chính thực tế trong phiên bản bàn giao. | Won't | Demo chỉ dùng mock Ví/Thẻ; không cần tài khoản merchant hay phát sinh giao dịch thật. | [Giới hạn theo Task 1.1] |
| FR-24 | Giao hàng và định vị / OS-02 | Không xây dựng hệ thống tài xế/theo dõi vận chuyển. | Won't | Luồng demo kết thúc theo quy trình nhận đồ uống tại quầy, không có chức năng đặt giao hàng/định vị. | [Giới hạn theo Task 1.1] |

**Ghi chú phạm vi:** Các mục `Could`/`Won't` được liệt kê để minh bạch phạm vi, **không thay thế** các mục `Must`. Các mục OS-03–OS-05 khác trong Task 1.1 tiếp tục ngoài phạm vi: đa chi nhánh, ứng dụng native độc lập, kế toán/đối soát ngân hàng thực tế.

## 4. Yêu cầu phi chức năng (Non-functional Requirements)

| Mã | Tên / Phạm vi | Mô tả yêu cầu | MoSCoW | Tiêu chí chấp nhận (AC) | Nguồn |
|---|---|---|---|---|---|
| NFR-01 | Hiệu năng API / IS-10 | API phản hồi nhanh với dữ liệu mẫu. | Must | Thời gian phản hồi API **dưới 500 ms với dữ liệu mẫu** theo điều kiện đo nhóm công bố (endpoint, máy/môi trường, số request); ghi lại kết quả đo. | [Đề gốc, mục 4.2]; điều kiện đo là [Cụ thể hóa] |
| NFR-02 | Bảo mật mật khẩu / IS-04 | Không lưu mật khẩu rõ; dùng phương pháp băm mật khẩu. | Must | Kiểm tra bản ghi người dùng không chứa mật khẩu gốc; đăng nhập vẫn xác minh được mật khẩu đúng/sai. | [Đề] |
| NFR-03 | Xác thực và phân quyền / IS-04 | Dùng JWT bảo vệ API phù hợp. | Must | Request thiếu JWT, JWT sai hoặc hết hạn bị từ chối ở route được bảo vệ; dữ liệu lịch sử chỉ thuộc chủ tài khoản. | [Đề] + [Cụ thể hóa] |
| NFR-04 | Validate và xử lý lỗi / IS-05–IS-06 | Cả Frontend và Backend kiểm tra dữ liệu, báo lỗi rõ và không làm hỏng trạng thái. | Must | API từ chối đầu vào không hợp lệ với phản hồi lỗi; giao diện hiển thị lỗi thay vì giả định thao tác thành công; các nhánh loading/empty/error menu hoạt động. | [Assignment 2 Tasks 4.3, 5.1] |
| NFR-05 | Khả dụng/mobile-first / IS-01–IS-07 | Giao diện Next.js thiết kế ưu tiên màn hình điện thoại, theo hướng PWA và dùng được trên trình duyệt. | Must | Kiểm tra luồng menu → xác nhận trên viewport di động do nhóm thống nhất và ít nhất một trình duyệt desktop; không có thao tác cốt lõi bị che/khuất; minh chứng kiểm thử. Viewport/trình duyệt cụ thể cần chốt. | [Đề] + [Cụ thể hóa] |
| NFR-06 | Công nghệ bắt buộc / CT-01–CT-03 | Frontend Next.js, Backend NestJS, dữ liệu PostgreSQL; không thay thế ba thành phần này. | Must | Repository có dự án tương ứng; ứng dụng đang chạy sử dụng đúng ba công nghệ được quy định. | [Assignment 2, mục 1.1] |
| NFR-07 | Chạy local và tái tạo dữ liệu / IS-10 | Môi trường local gồm web/API/database, có migration/seed và Docker Compose. | Must | Từ hướng dẫn README, chạy `docker compose up` với cấu hình phù hợp; migration/seed tái tạo được dữ liệu mẫu; web/API truy cập được. | [Assignment 2, Task 5.2] |
| NFR-08 | Kiểm thử tự động và CI / IS-10 | Có unit, integration, tối thiểu một E2E; CI kiểm tra Install → Lint → Unit Test → Build khi mở PR. | Must | Các lệnh kiểm thử chạy được; có test menu→xác nhận đơn; PR không merge nếu lint/test/build lỗi; lưu log CI thành công và lỗi. | [Assignment 2, Task 4.4, 5.2] |
| NFR-09 | CD, production và an toàn cấu hình / IS-10 | Đóng gói, triển khai, health check, smoke test, rollback; bảo vệ secret. | Must | Có URL HTTPS frontend, API và health endpoint hoạt động; database production không public trực tiếp; không có secret trong repo/log; pipeline có quality gate, bước deploy và phương án rollback. | [Assignment 2, Task 5.3–5.4] |
| NFR-10 | Truy vết và bàn giao / IS-10 | Tài liệu, sơ đồ, code, test và quyết định được quản lý phiên bản, dễ đối chiếu. | Must | Có file `docs/traceability-matrix.md` nối mã yêu cầu → Use Case/User Story → sơ đồ → API/code → test; có README, release/tag, release notes, demo, Sprint Review/Retrospective. | [Assignment 2, mục 8–9 và Task 5.4] |

## 5. Phân loại MoSCoW

- **Must:** Bắt buộc để đáp ứng đề và nghiệm thu MVP/delivery, bao gồm FR-01–FR-19 và NFR-01–NFR-10.
- **Should:** Không có yêu cầu riêng nào được hạ từ phần bắt buộc xuống Should. Nhóm chỉ thêm mục Should nếu thống nhất một cải tiến có giá trị nhưng không bắt buộc và ghi nhận thay đổi SRS.
- **Could:** FR-20–FR-22 (giao diện nhân viên riêng, trang quản trị, thông báo chủ động), chỉ thực hiện khi còn nguồn lực và được duyệt.
- **Won't (phiên bản bàn giao):** FR-23–FR-24 cùng OS-03–OS-05 nêu ở Task 1.1; không có nghĩa là bị cấm ở các phiên bản tương lai.

## 6. Use Case Diagram tổng quát

**Tệp nguồn (PlantUML):** [use-case.puml](../diagrams/use-case.puml) (`docs/diagrams/use-case.puml`)  
**Tệp kết xuất:** `docs/diagrams/use-case.png`  

![Use Case Diagram tổng quát](../diagrams/use-case.png)  

Sơ đồ bao gồm khách hàng và dịch vụ thanh toán mô phỏng là actor trực tiếp. Actor **Nhân viên quầy** chỉ tương tác với use case mở rộng giao diện nhân viên (nét đứt/nhãn Could). **Quản lý cửa hàng/PO, giảng viên và nhóm phát triển** là stakeholder ở Task 1.1, nhưng không mặc nhiên thành actor trong Use Case Diagram khách hàng vì họ không có tương tác trực tiếp đã xác định trong phạm vi MVP; nếu bổ sung giao diện quản trị, Quản lý mới thành actor liên quan.

| Actor | Mã tham chiếu Task 1.1 | Tương tác | Phạm vi |
|---|---|---|---|
| Khách hàng | ST-01 | Xem/chọn hàng, giỏ, xác thực, đặt/thanh toán, xem đơn | MVP |
| Dịch vụ thanh toán giả lập | ST-06 | Phản hồi kết quả thanh toán từ hệ thống | MVP (actor hệ thống ngoài) |
| Nhân viên quầy | ST-02 | Tiếp nhận/cập nhật trạng thái qua giao diện riêng | Chỉ extension FR-20 |
| Quản lý/PO | ST-03 | Chỉnh sửa menu qua giao diện riêng nếu xây dựng | Chỉ extension FR-21 |
| Giảng viên nghiệm thu; Nhóm phát triển | ST-04; ST-05 | Đánh giá/xây dựng hệ thống, không phải hành vi sử dụng app đã đặc tả | Stakeholder, không là actor trong sơ đồ này |

| Mã Use Case | Use Case | FR liên quan | Actor chính | Phạm vi |
|---|---|---|---|---|
| UC-01 | Xem menu | FR-01 | Khách hàng | Must |
| UC-02 | Xem chi tiết/chọn tùy chọn | FR-02, FR-03 | Khách hàng | Must |
| UC-03 | Quản lý giỏ và tổng tiền | FR-04–FR-06 | Khách hàng | Must |
| UC-04 | Đăng ký | FR-07 | Khách hàng | Must |
| UC-05 | Đăng nhập | FR-08 | Khách hàng | Must |
| UC-06 | Đặt đơn | FR-09, FR-17 | Khách hàng | Must |
| UC-07 | Thanh toán mô phỏng | FR-10, FR-11, FR-16 | Khách hàng; Payment Service hỗ trợ | Must |
| UC-08 | Nhận xác nhận đơn | FR-12 | Khách hàng | Must |
| UC-09 | Xem trạng thái/lịch sử đơn | FR-13, FR-14 | Khách hàng | Must |
| UC-10 | Kiểm soát chuyển trạng thái đơn | FR-15 | Nghiệp vụ nội bộ gọi từ xử lý đơn/thanh toán | Must |
| UC-11 | Áp dụng khuyến mãi | FR-18 | Khách hàng | Must (khi có mã hợp lệ) |
| UC-12 | Ghi nhận điểm thưởng | FR-19 | Kích hoạt nội bộ sau thanh toán PAID | Must |
| UC-13 | Giao diện xử lý đơn nhân viên | FR-20 | Nhân viên quầy | Could |
| UC-14 | Quản lý menu | FR-21 | Quản lý | Could |
| UC-15 | Gửi thông báo chủ động | FR-22 | Khách hàng nhận thông báo (nếu có) | Could |
| UC-16 | Kiểm tra tồn kho | FR-17 | Hành vi hỗ trợ bên trong UC-06 | Must |
| UC-17 | Xử lý thanh toán idempotent | FR-16 | Hành vi hỗ trợ bên trong UC-07 | Must |

**Hai Use Case hỗ trợ bổ sung để truy vết:** `UC-16 – Kiểm tra tồn kho (FR-17)` và `UC-17 – Xử lý idempotency (FR-16)`. `UC-18` là mã dành trước cho Task 1.3, chưa phải một chức năng mới của MVP.

**Quy ước UML:** đường liền từ actor đến oval là **association**. `<<include>>` dùng cho hành vi bắt buộc được tái sử dụng trong luồng (ví dụ Đặt đơn → Kiểm tra tồn kho; Thanh toán → Xử lý thanh toán idempotent). `<<extend>>` chỉ dùng cho hành vi điều kiện như Áp dụng khuyến mãi lên Quản lý giỏ/tổng tiền khi khách nhập mã; **không** dùng `extend` chỉ vì một màn hình xuất hiện sau màn hình khác. Các use case xử lý nội bộ được thể hiện để truy vết FR nhưng không giả định chúng là thao tác độc lập của người dùng. Bản sơ đồ không dùng `include` giữa “Đặt đơn” và “Đăng nhập”: xác thực là tiền điều kiện/guard của API, không phải mỗi lần đặt đơn đều thực hiện lại thao tác đăng nhập. `UC-18 – Đặt và thanh toán đơn hàng` được **dành riêng (đề xuất)** cho Use Case trọng tâm sẽ đặc tả ở Task 1.3. Đây là Use Case nghiệp vụ tổng hợp UC-06 và UC-07, không thay thế hoặc đánh số lại hai chức năng hiện có; UC-18 chưa được triển khai như một oval độc lập trong sơ đồ tổng quát để tránh lặp diễn giải.

## 7. Đối chiếu yêu cầu và Use Case

| Nhóm yêu cầu | Use Case thể hiện | Ghi chú |
|---|---|---|
| FR-01–FR-06 | UC-01–UC-03 | Menu, chi tiết, tùy chọn, giỏ và tổng tiền |
| FR-07–FR-08 | UC-04–UC-05 | Tài khoản/JWT |
| FR-09, FR-17 | UC-06, UC-16 | UC-06 `<<include>>` UC-16 để kiểm tra tồn kho |
| FR-10, FR-11, FR-16 | UC-07, UC-17 | UC-07 `<<include>>` UC-17; Payment Service mock là actor ngoài |
| FR-12–FR-14 | UC-08–UC-09 | Xác nhận, trạng thái, lịch sử đơn |
| FR-15 | UC-10 | Quy tắc trạng thái Backend, được gọi bởi các luồng xử lý liên quan |
| FR-18–FR-19 | UC-11–UC-12 | Khuyến mãi, điểm thưởng theo đề gốc Task 10 |
| FR-20–FR-22 | UC-13–UC-15 | Các mục Could, tách khỏi luồng MVP |
| FR-23–FR-24 | Không vẽ | Won't: ngoài phạm vi bản bàn giao |
| NFR-01–NFR-10 | Áp dụng ngang hệ thống | NFR được kiểm chứng bằng test, môi trường chạy và minh chứng; không cần mỗi NFR một oval |

## 8. Các quyết định đề xuất, chờ nhóm phê duyệt

Các giá trị bên dưới là **phương án đề xuất để có thể viết test**, không được coi là nhóm đã thống nhất. Nếu thay đổi, cần cập nhật lại tiêu chí chấp nhận, Task 1.1 (khi ảnh hưởng phạm vi), sơ đồ và ma trận truy vết.

| Chủ đề | Phương án nhóm có thể chọn | Trạng thái |
|---|---|---|
| Quy tắc giảm giá FR-18 | Một mã áp dụng một lần cho một đơn; mã mẫu `BREW10` giảm 10% tiền hàng, tối đa 30.000đ; không làm tổng âm; mã sai/hết hiệu lực bị từ chối | Đề xuất, chờ duyệt |
| Loyalty FR-19 | Cộng 1 điểm/10.000đ thực trả (lấy phần nguyên) sau lần chuyển sang `PAID` đầu tiên; không cộng lại với một đơn | Đề xuất, chờ duyệt |
| Idempotency FR-16 | Ràng buộc key theo người dùng + thao tác thanh toán; cùng key và cùng payload trả lại cùng kết quả; cùng key nhưng khác payload bị từ chối (ví dụ HTTP 409); lưu kết quả giao dịch trong cơ sở dữ liệu | Đề xuất, chờ duyệt |
| Hiệu năng NFR-01 | Dùng seed cố định; kiểm tra các endpoint chính khi chạy local, 30 lượt/endpoint sau 5 lượt warm-up, mỗi lượt dưới 500 ms theo phép đo phía client; lưu môi trường và kết quả | Đề xuất phương pháp đo, ngưỡng 500 ms lấy từ đề gốc |
| Giao diện NFR-05 | Kiểm tra viewport 390 × 844 px và 1366 × 768 px; Chrome và Edge phiên bản sẵn có; không bị cắt thao tác cốt lõi | Đề xuất, chờ duyệt |
| Mã UC trọng tâm | Dành `UC-18 – Đặt và thanh toán đơn hàng` cho Task 1.3, không đổi UC-01…UC-17 | Đề xuất, chờ duyệt |
| Trạng thái đơn và nhân viên | Backend có State Machine và cơ chế kiểm thử; giao diện Barista riêng chỉ là EX-01/FR-20 Could | Phù hợp bản Task 1.1 đang có, chờ nhóm duyệt |

**Lưu ý về đề gốc:** Không có công thức chiết khấu, mức tích điểm, thời hạn lưu Idempotency-Key, cấu hình máy đo hiệu năng hoặc danh sách trình duyệt cụ thể được ấn định trong hai PDF. Vì vậy các giá trị trên không phải trích nguyên văn từ đề.

### Các điểm kiểm tra trước khi khóa phiên bản


1. Xác nhận bản `context-and-scope.md` trên máy vẫn dùng IS-01–IS-10, EX-01–EX-03 và OS-01–OS-05 như bản Task 1.1 đã lưu trước đây; bản trên máy có thể đã thay đổi và cần được ưu tiên đối chiếu lại.
2. Xác nhận cách tạo/cập nhật trạng thái đơn để demo và kiểm thử **không yêu cầu giao diện Barista riêng** trong MVP; vẫn phải đáp ứng nghiệp vụ State Machine.
3. Chốt quy tắc giảm giá (kiểu mã, giới hạn, cách tính) và tỷ lệ cộng Loyalty; đề gốc bắt buộc chức năng nhưng không ấn định công thức.
4. Chốt cách nhận diện yêu cầu thanh toán lặp (phạm vi lưu `Idempotency-Key`, cùng/nội dung khác), cùng kịch bản test đồng thời.
5. Chốt các giá trị trong bảng đề xuất để điều kiện đo NFR-01, NFR-05 lặp lại được.
6. Xác nhận FR-20–FR-22 chỉ là Could, không lấn át các yêu cầu Must. Không thêm giao dịch tiền thật hoặc giao hàng vào MVP.
7. Thống nhất UC-18 là mã dành riêng cho Use Case trọng tâm ở Task 1.3; chưa thực hiện Task 1.3 trong tài liệu này.

## 9. Kết luận

SRS này bao quát luồng MVP và những yêu cầu nghiệp vụ Backend theo đề gốc, đồng thời giữ rõ ranh giới với phần mở rộng/ngoài phạm vi từ Task 1.1. Sau khi nhóm rà soát các quyết định ở Mục 8, lưu phiên bản đã duyệt cùng sơ đồ nguồn và ảnh kết xuất lên nhánh làm việc; chưa cần tạo Pull Request cho riêng Task 1.2. Bước kế tiếp (chỉ khi được yêu cầu) là Task 1.3 – đặc tả một Use Case trọng tâm.
