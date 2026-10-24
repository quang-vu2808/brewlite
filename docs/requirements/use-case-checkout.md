# TASK 1.3 – ĐẶC TẢ USE CASE TRỌNG TÂM

**Dự án:** BrewLite – Đặt và thanh toán đồ uống không dùng tiền mặt  
**Học phần:** Công nghệ Phần mềm – Trường Đại học Sài Gòn  
**Use Case:** UC-18 – Đặt và thanh toán đơn hàng (Place Order and Checkout)  
**Phiên bản:** 0.9 – Dự thảo kỹ thuật, chờ nhóm xác nhận các quyết định ở Mục 12  
**Tài liệu liên quan:** `context-and-scope.md` (Task 1.1), `srs.md` (Task 1.2)  
**Nguồn đề:** BrewLite gốc (mục 4, 5, 8–9, 12); Assignment 2 (mục 1.1, 3.3, 4.2).

## 1. Mục đích và phạm vi

UC-18 mô tả nghiệp vụ xuyên suốt từ lúc khách xác nhận giỏ hàng, được xác thực, tạo đơn và thanh toán Ví/Thẻ **giả lập** cho tới khi nhận được kết quả. Đây là Use Case tổng hợp nghiệp vụ của UC-06 (Đặt đơn) và UC-07 (Thanh toán mô phỏng), **không đổi** mã của các Use Case đó trong SRS. Việc xem menu, lựa chọn size/topping và thêm vào giỏ đã được đặc tả ở các UC trước và là bước chuẩn bị, không lặp lại tại đây. Không có thanh toán tiền thật, giao hàng hoặc giao diện Barista riêng trong luồng bắt buộc.

**Mục tiêu nghiệp vụ:** tạo được đơn chính xác, không bán vượt tồn kho, không xử lý thanh toán trùng lặp, thể hiện đúng kết quả thanh toán và cộng điểm theo quy tắc khi đơn được thanh toán thành công.

**Tệp nguồn (PlantUML):** [use-case-checkout.puml](../diagrams/use-case-checkout.puml)

![Use Case Đặt và thanh toán đơn hàng](../diagrams/use-case-checkout.png)

## 2. Thông tin đặc tả

| Thuộc tính | Nội dung |
|---|---|
| Mã / tên | UC-18 – Đặt và thanh toán đơn hàng |
| Actor chính | Khách hàng (Customer, ST-01) |
| Actor phụ | Mock Payment Service (ST-06), hệ thống ngoài nhận yêu cầu và trả kết quả giả lập |
| Các bộ phận nội bộ, không phải Actor | Next.js UI, NestJS API, PostgreSQL; các thành phần thuộc ranh giới BrewLite |
| Trigger | Khách nhấn “Tiếp tục đặt hàng/Thanh toán” từ giỏ hàng đang hiển thị |
| Tần suất | Mỗi lần khách bắt đầu một lượt checkout; không ấn định tần suất sử dụng |
| Phạm vi Task 1.1 | IS-03 đến IS-09; không bao gồm OS-01 (tiền thật) hoặc EX-01 (giao diện Barista) |
| Quan hệ UC | Bao gồm UC-06, UC-07 trong phạm vi nghiệp vụ; tham chiếu UC-16 kiểm tra tồn kho, UC-17 idempotency; khuyến mãi là hành vi tùy điều kiện |

## 3. Tiền điều kiện (Preconditions)

- **PRE-01:** Khách có giỏ hàng từ UC-03; tại bước checkout, hệ thống còn phải xác thực lại tính hợp lệ, không tin số tiền do client gửi.
- **PRE-02:** Dữ liệu menu, cấu hình giá và tồn kho tồn tại trong cơ sở dữ liệu; Mock Payment Service đã được cấu hình để mô phỏng thành công/thất bại.
- **PRE-03:** Đặt đơn yêu cầu phiên đăng nhập/JWT hợp lệ. Nếu chưa có hoặc token sai/hết hạn, thực hiện AF-02 trước khi tạo đơn; vì vậy đây là điều kiện phải thỏa **tại bước M4**, không phải điều kiện để mở màn hình giỏ.
- **PRE-04:** Mỗi yêu cầu thanh toán gửi `Idempotency-Key` theo cơ chế FR-16; cách định nghĩa phạm vi và lưu trữ key là đề xuất cần phê duyệt tại Mục 12.

## 4. Hậu điều kiện (Postconditions)

| Mã | Kết quả |
|---|---|
| POST-S1 – Thành công | Đơn và các dòng hàng đã lưu; trạng thái là `PAID`; có bản ghi thanh toán mock thành công; thông tin tồn kho nhất quán; điểm Loyalty được ghi đúng một lần; trả mã đơn và trạng thái cho khách. |
| POST-F1 – Không thể tạo đơn | Không tạo đơn hợp lệ hoặc trừ tồn kho một phần; giỏ được giữ để sửa hoặc thử lại; khách nhận lý do phù hợp. |
| POST-F2 – Thanh toán thất bại | Đơn đã tạo ở trạng thái `PAYMENT_FAILED`, có bản ghi kết quả thất bại; giỏ không bị xóa; không ghi điểm Loyalty; có thể thử lại bằng yêu cầu thanh toán **mới** theo chuyển trạng thái hợp lệ. |
| POST-F3 – Gửi lặp | Cùng key và cùng nội dung không tạo giao dịch hay tác động tồn kho/điểm trùng; trả lại kết quả đã ghi nhận. |
| POST-F4 – Kết quả chưa xác định | Không tự kết luận `PAID` hoặc phát thanh toán mới khi trạng thái mock chưa xác minh được; cần tra cứu/đối soát theo cơ chế đề xuất ở Mục 12. |

## 5. Luồng chính – Main Flow (MF)

**Kịch bản:** khách đã có giỏ hợp lệ, đăng nhập hợp lệ, còn đủ tồn kho, có thể không áp dụng khuyến mãi, chọn một phương thức mock, và nhận kết quả thành công.

| Bước | Actor | Hành động | Phản hồi của hệ thống |
|---|---|---|---|
| M1 | Customer | Mở giỏ hàng và chọn tiếp tục checkout. | Hiển thị các dòng hàng, size/topping, số lượng, thành tiền; chưa tạo đơn. |
| M2 | Customer | Xem lại giỏ và xác nhận muốn đặt các mặt hàng. | Kiểm tra giỏ không trống, định dạng, sản phẩm/tùy chọn còn hợp lệ; tính lại giá và tổng trên dữ liệu tin cậy; lỗi chuyển AF-01/EF-01. |
| M3 | Customer | Không nhập mã khuyến mãi (hoặc áp dụng mã theo AF-05). | Hiển thị tổng thanh toán cuối cùng, không âm, để khách xác nhận. |
| M4 | Customer | Tiếp tục dưới phiên đăng nhập hiện có. | API kiểm tra JWT/quyền của khách; chưa xác thực chuyển AF-02/EF-02. |
| M5 | Customer | Xác nhận tạo đơn với tổng tiền hiển thị. | Backend bắt đầu transaction; kiểm tra tồn kho hiện hành, chống đặt đồng thời bằng optimistic locking; tạo `Order`, `OrderItem` trạng thái `PENDING` và cập nhật/giữ tồn kho nhất quán; commit đồng bộ. Thiếu tồn hoặc xung đột chuyển AF-03/EF-03. |
| M6 | Customer | Chọn phương thức **Ví** hoặc **Thẻ** giả lập. | Hiển thị hai lựa chọn và số tiền từ đơn đã lưu; không kết nối hệ thống thu tiền thật. |
| M7 | Customer | Xác nhận thanh toán, gửi yêu cầu có `Idempotency-Key`. | Backend xác thực quyền sở hữu đơn, trạng thái hợp lệ, số tiền/phương thức, tra cứu key; chưa có giao dịch trùng thì ghi nhận việc xử lý và gọi Mock Payment Service. Nếu lặp chuyển AF-06/EF-05. |
| M8 | Mock Payment Service | Trả kết quả mock **thành công**. | Backend ghi nhận kết quả và chuyển hợp lệ `PENDING → PAID` theo State Machine trong transaction; không thực hiện thêm lần thanh toán cho cùng key. |
| M9 | Hệ thống (nội bộ) | Thực hiện nghiệp vụ sau thanh toán thành công. | Ghi Loyalty theo quy tắc đã duyệt, bảo đảm một đơn không được cộng điểm hai lần; không ghi điểm nếu đơn chưa `PAID`. |
| M10 | Customer | Xem thông báo kết quả. | Hiển thị mã đơn, tổng tiền, phương thức và trạng thái `PAID`; dữ liệu tra cứu lịch sử/trạng thái đơn đã sẵn sàng. Kết thúc UC-18 thành công. |

**Quy ước:** M5 là một transaction nguyên tử đối với việc tạo đơn và thay đổi tồn kho. M8–M9 là thao tác ghi nhận kết quả thanh toán/điểm có ràng buộc chống lặp. Không giữ transaction cơ sở dữ liệu mở trong lúc chờ lời gọi mạng tới Mock Payment Service; đây là phương án kỹ thuật đề xuất để tránh khóa kéo dài.

## 6. Luồng thay thế – Alternative Flows (AF)

| Mã / phát sinh | Điều kiện và xử lý cụ thể | Tiếp tục / kết thúc |
|---|---|---|
| AF-01 / M2 | Khách sửa hoặc xóa dòng hàng hợp lệ trước khi xác nhận. Hệ thống cập nhật giỏ, tính lại tổng từ dữ liệu chuẩn. | Quay lại M2; nếu giỏ thành trống chuyển EF-01. |
| AF-02 / M4 | Khách chưa đăng nhập. Hệ thống yêu cầu đăng nhập (UC-05), giữ nguyên giỏ. Khách đăng nhập thành công và hệ thống kiểm tra JWT mới. | Quay lại M4; nếu hủy thì kết thúc chưa tạo đơn. |
| AF-03 / M5 | Sản phẩm thiếu tồn hoặc hết hàng. Transaction không commit đơn/tồn kho dở dang; hệ thống thông báo mặt hàng và số lượng có thể đặt theo dữ liệu mới, giữ giỏ. | Quay lại M2 sau khi khách điều chỉnh; nếu không điều chỉnh thì kết thúc chưa tạo đơn. |
| AF-04 / M6 | Khách chọn Thẻ thay Ví hoặc đổi ngược lại trước khi gửi thanh toán; hệ thống thay đổi phương thức trong yêu cầu, không thu tiền thật. | Tiếp tục M7. |
| AF-05 / M3 | Khách nhập mã khuyến mãi; kiểm tra hiệu lực và điều kiện phía server. Mã hợp lệ được áp giảm theo cấu hình, tính lại tổng và lưu snapshot giá/giảm vào đơn khi tạo. | Tiếp tục M4. Mã sai/hết hạn chuyển EF-04; khách có thể bỏ mã để quay lại M3. |
| AF-06 / M7 | Client gửi lại **cùng key, cùng payload** khi yêu cầu trước đã được xử lý. Hệ thống trả lại đúng kết quả đã ghi, không gọi mock lần nữa, không tạo Payment/Order mới, không trừ thêm tồn hoặc cộng điểm lại. | Nếu kết quả cũ `PAID`, đến M10; nếu `PAYMENT_FAILED`, đến AF-07; nếu còn xử lý/chưa rõ, đến EF-06. |
| AF-07 / M8 hoặc AF-06 | Mock trả thất bại; Backend ghi Payment thất bại và chuyển `PENDING → PAYMENT_FAILED`, hiển thị lỗi; không ghi Loyalty, giữ giỏ. Khách chọn thử lại. | Kết thúc lượt thanh toán thất bại; để thử lại, kiểm tra trạng thái hợp lệ `PAYMENT_FAILED → PENDING` theo sơ đồ đề gốc và tạo yêu cầu thanh toán **mới với key mới** tại M6–M7 cho cùng đơn (không tạo đơn thứ hai). |
| AF-08 / M10 | Khách chọn xem trạng thái hoặc lịch sử đơn sau khi nhận xác nhận. | Chuyển sang UC-09 (FR-13, FR-14); UC-18 đã kết thúc. |

## 7. Luồng ngoại lệ – Exception Flows (EF)

| Mã / phát sinh | Điều kiện phát sinh, phản hồi và tác động dữ liệu | Tiếp tục / kết thúc |
|---|---|---|
| EF-01 / M2 | Giỏ trống, số lượng không hợp lệ, sản phẩm/size/topping không còn hợp lệ, hoặc giá client sai lệch. Không tạo đơn, chỉ rõ dòng hàng phải sửa và giữ giỏ. | Quay lại M2 sau khi chỉnh; nếu không còn sản phẩm thì dừng checkout. |
| EF-02 / M4 hoặc M7 | JWT thiếu, sai/hết hạn hoặc tài khoản không sở hữu đơn. Backend từ chối yêu cầu, không cho tạo/chi trả đơn của người khác, không thay đổi trạng thái. | Nếu chỉ hết phiên và chưa tạo đơn: quay AF-02 rồi M4; nếu sai quyền tại M7: dừng, ghi log lỗi phù hợp. |
| EF-03 / M5 | Xung đột optimistic locking, transaction lỗi hoặc cập nhật tồn kho không thành công. Rollback toàn bộ M5; không có đơn/thay đổi tồn kho nửa chừng. | Có thể tải dữ liệu mới và thử M5 sau khi kiểm tra lại M2; lỗi kéo dài thì kết thúc và thông báo. |
| EF-04 / M3 | Mã giảm giá không tồn tại/hết hạn/không đạt điều kiện. Không áp dụng giảm; hệ thống hiển thị lý do, không tự ý tính giá có giảm. | Khách sửa mã, bỏ mã rồi quay M3, hoặc hủy checkout. |
| EF-05 / M7 | **Cùng key nhưng payload khác** (đổi đơn, tiền hoặc phương thức). Đề xuất trả lỗi xung đột, không thực hiện yêu cầu thứ hai. | Dừng yêu cầu lỗi; muốn thanh toán nội dung mới phải có thao tác hợp lệ và key mới. |
| EF-06 / M7–M8 | Mock timeout/mất kết nối hoặc kết quả không xác định. Không đoán `PAID`, không ghi Loyalty; trạng thái thanh toán cần được kiểm tra bằng cùng key trước khi thử yêu cầu mới. | Thông báo đang xác minh; đối soát kết quả cũ, rồi hoàn tất M8–M10 hoặc AF-07. Cơ chế timeout/đối soát là **đề xuất cần nhóm chốt**. |
| EF-07 / M8–M9 | Lưu kết quả hoặc ghi Loyalty gặp lỗi. Không gọi mock thêm bằng key mới để “sửa”; lưu/truy hồi idempotent và thử lại công việc hậu thanh toán an toàn, bảo đảm không cộng điểm hai lần. | Chỉ báo `PAID` khi kết quả thanh toán đã được ghi xác nhận; phần điểm lỗi được khôi phục theo cơ chế nhất quán cần chốt ở thiết kế; ghi nhận sự cố. |

## 8. Quy tắc nghiệp vụ – Business Rules

| Mã | Quy tắc | Nguồn / trạng thái |
|---|---|---|
| BR-01 | Chỉ tạo đơn từ giỏ có ít nhất một dòng hợp lệ; Backend kiểm tra lại sản phẩm, tùy chọn, số lượng, giá, tổng và JWT. | FR-06, FR-08, FR-09; kiểm tra cụ thể là diễn giải nghiệm thu. |
| BR-02 | Tạo đơn và cập nhật/giữ tồn kho là transaction nguyên tử; dùng optimistic locking và không bán vượt tồn khi nhiều yêu cầu đồng thời. | **Bắt buộc:** đề gốc Task 10, Assignment 2 Task 2.2; FR-17. |
| BR-03 | Trạng thái thành công `PENDING → PAID → PREPARING → READY → COMPLETED`; nhánh thất bại `PENDING → PAYMENT_FAILED`, có thể thử lại theo sơ đồ; chuyển trái phép bị chặn. | **Bắt buộc:** đề gốc Task 10; FR-15. Quy tắc `PAYMENT_FAILED → PENDING` trước khi retry dựa vào sơ đồ đề gốc. |
| BR-04 | Thanh toán chỉ qua Mock Payment Service, phương thức Ví/Thẻ; không có giao dịch tiền thật. | **Bắt buộc:** đề gốc/Assignment 2; FR-10, FR-11; OS-01. |
| BR-05 | Xử lý Idempotency-Key: cùng key/cùng payload cho cùng thao tác chỉ có một kết quả; cùng key/payload khác bị từ chối; ràng buộc uniqueness và lưu trạng thái xử lý ở Backend. | Ngăn trùng là **bắt buộc** (FR-16); phạm vi key, kiểu phản hồi, thời hạn lưu là **đề xuất**. |
| BR-06 | Khuyến mãi chỉ áp dụng khi hợp lệ; tổng sau giảm không âm; mã không hợp lệ không được tính giảm. | FR-18 **bắt buộc**; công thức `BREW10` giảm 10%, tối đa 30.000đ là **đề xuất SRS Mục 8**. |
| BR-07 | Chỉ cộng Loyalty khi thanh toán thành công và đơn chuyển `PAID`; cùng đơn chỉ được cộng một lần. | FR-19 **bắt buộc**; tỷ lệ 1 điểm/10.000đ thực trả (lấy phần nguyên) là **đề xuất SRS Mục 8**. |
| BR-08 | Thanh toán thất bại giữ giỏ để khách sửa/thử lại. Phải quy định chính sách tồn kho của đơn thất bại để không trừ vĩnh viễn, và không làm phát sinh bán vượt tồn khi retry. | Giữ giỏ và `PAYMENT_FAILED` theo đề gốc; cơ chế giải phóng/giữ tồn cần **nhóm chốt**. |
| BR-09 | Yêu cầu thanh toán retry thực sự là thao tác mới với key mới sau khi biết kết quả cũ thất bại; retry mạng cùng thao tác phải tái dùng key cũ. | **Đề xuất cụ thể hóa** để đồng thời đáp ứng FR-15 và FR-16. |
| BR-10 | Các thao tác sau thanh toán cần xử lý an toàn khi lặp: cùng đơn không cộng điểm thêm dù nhận lại phản hồi hoặc khôi phục lỗi. | FR-16 và FR-19; kỹ thuật thực hiện chi tiết chốt ở thiết kế. |

## 9. Liên kết SRS và phạm vi

| Mã yêu cầu | Vai trò trong UC-18 | Use Case SRS liên quan | Phạm vi Task 1.1 |
|---|---|---|---|
| FR-04–FR-06 | Giỏ hàng và tổng tiền đầu vào | UC-03 | IS-03 |
| FR-07–FR-08 | Đăng nhập/JWT khi checkout | UC-04, UC-05 | IS-04 |
| FR-09 | Tạo đơn `PENDING` | UC-06 | IS-05 |
| FR-10–FR-11 | Phương thức và kết quả mock | UC-07 | IS-06 |
| FR-12–FR-14 | Xác nhận, trạng thái, lịch sử | UC-08, UC-09 | IS-07, IS-08 |
| FR-15 | State Machine hợp lệ | UC-10 | IS-08 |
| FR-16 | Idempotency thanh toán | UC-17 | IS-09 |
| FR-17 | Transaction và tồn kho đồng thời | UC-16 | IS-09 |
| FR-18–FR-19 | Mã khuyến mãi và Loyalty | UC-11, UC-12 | IS-09 |
| NFR-02–NFR-04 | Hash/JWT và validate | Áp dụng ngang UC-18 | IS-04, IS-10 |
| NFR-07–NFR-10 | Khả năng chạy, test, CI/CD, truy vết | Áp dụng khi hiện thực/kiểm thử | IS-10 |

**Ngoài phạm vi:** FR-20–FR-22 (Could: EX-01–EX-03), FR-23–FR-24 (Won't: OS-01–OS-02), OS-03–OS-05 không là điều kiện hoàn tất UC-18. Sơ đồ UC-18 tập trung vào hành vi đặt và thanh toán, không đưa Actor giảng viên/nhóm phát triển hoặc giao diện quản lý vào phạm vi sử dụng.

## 10. Tiêu chí chấp nhận có thể chuyển thành Test Case

| Test ID đề xuất | Thiết lập / thao tác | Kết quả cần kiểm chứng |
|---|---|---|
| UC18-AT-01 | Giỏ hợp lệ, JWT hợp lệ, đủ tồn, mock thành công | Chỉ một đơn có mã và các dòng đúng; thanh toán `PAID`; hiển thị kết quả; Loyalty cộng một lần. |
| UC18-AT-02 | Giỏ trống/sản phẩm sai/số lượng sai | Từ chối tạo đơn, giữ giỏ, thông báo lỗi rõ; không trừ tồn. |
| UC18-AT-03 | Không đăng nhập/JWT sai hoặc hết hạn | Chặn thao tác được bảo vệ; đăng nhập lại rồi tiếp tục được; không tạo đơn trái phép. |
| UC18-AT-04 | Tồn kho không đủ | Không tạo đơn hoặc trừ tồn dở dang; chỉ ra hàng hết/thiếu. |
| UC18-AT-05 | Nhiều yêu cầu đặt cùng sản phẩm vượt tồn | Không bán vượt tồn, tồn không âm; transaction/optimistic locking được kiểm chứng. |
| UC18-AT-06 | Chọn Ví hoặc Thẻ và mock thành công | Payment nhận đúng phương thức và số tiền; đơn `PENDING → PAID`. |
| UC18-AT-07 | Mock trả thất bại | Đơn `PAYMENT_FAILED`, giữ giỏ, không cộng Loyalty; có thông báo kết quả. |
| UC18-AT-08 | Sau thất bại, retry hợp lệ bằng key mới | Không tạo đơn thứ hai; đi qua trạng thái hợp lệ; chỉ một kết quả thành công và một lần cộng điểm nếu retry thành công. |
| UC18-AT-09 | Gửi lặp hai lần cùng key và payload | Một lần xử lý thanh toán có hiệu lực; cùng kết quả trả về, không trùng tác động. |
| UC18-AT-10 | Gửi cùng key nhưng payload khác | Từ chối yêu cầu xung đột; không gọi thanh toán mới. **Chi tiết phản hồi cần duyệt.** |
| UC18-AT-11 | Mã hợp lệ / không hợp lệ | Giảm đúng công thức cấu hình hoặc từ chối mã; tổng không âm. |
| UC18-AT-12 | Gửi lặp phản hồi thành công/khôi phục hậu xử lý | Loyalty chỉ có một bút toán cho một đơn. |
| UC18-AT-13 | Cố chuyển `PAYMENT_FAILED → COMPLETED` trực tiếp | Bị từ chối, trạng thái không đổi. |
| UC18-AT-14 | Timeout kết quả mock | Không báo thành công khi chưa xác minh; không phát thanh toán trùng trong quá trình thử lại. **Cách đối soát cần duyệt.** |
| UC18-AT-15 | Sau `PAID`, xem màn xác nhận | Hiển thị đúng mã đơn/trạng thái/tổng tiền; xem lại lịch sử đúng chủ tài khoản. |

## 11. Giải thích sơ đồ UC-18

Sơ đồ đặt UC-18 ở giữa System Boundary **BrewLite**; Customer liên kết với UC-18 và các thao tác tùy điều kiện có ý nghĩa ở cấp người dùng. Mock Payment Service là Actor ngoài, kết nối đến hành vi xử lý thanh toán mô phỏng. UC-18 `<<include>>` UC-06 (Tạo đơn) và UC-07 (Thanh toán giả lập), nhằm thể hiện phạm vi hợp thành; UC-06 `<<include>>` UC-16 (Kiểm tra tồn kho) và UC-07 `<<include>>` UC-17 (Kiểm soát thanh toán lặp). UC-11 Áp dụng mã khuyến mãi `<<extend>>` UC-18 tại điểm mở rộng “khách nhập mã”; không dùng mũi tên để mô tả thứ tự màn hình. Xác thực là tiền điều kiện tại M4, không ép UC-18 `include` Đăng nhập mỗi lần sử dụng. Chuyển trạng thái/loyalty được mô tả bằng quy tắc và luồng trong tài liệu, không biến mọi xử lý kỹ thuật thành actor độc lập.

## 12. Quyết định đề xuất cần nhóm xác nhận trước khi khóa tài liệu

| Chủ đề | Đề xuất để viết test/triển khai | Trạng thái |
|---|---|---|
| UC trọng tâm | Giữ `UC-18` là Use Case tổng hợp UC-06 và UC-07, không đổi mã SRS cũ. | Chờ nhóm duyệt |
| Khuyến mãi | `BREW10` giảm 10% giá hàng, tối đa 30.000đ; không cho tổng âm; một mã/đơn. | Chờ nhóm duyệt |
| Loyalty | 1 điểm/10.000đ thực trả, lấy phần nguyên; chỉ cộng một lần khi `PAID`. | Chờ nhóm duyệt |
| Idempotency-Key | Duy nhất theo chủ tài khoản + thao tác thanh toán; cùng payload trả kết quả cũ, khác payload từ chối (đề xuất HTTP 409); lưu bằng ràng buộc DB. | Chờ nhóm duyệt |
| Timeout/đối soát | Lưu trạng thái đang xử lý, tra cứu kết quả theo cùng key trước khi cho retry. | Chờ nhóm duyệt |
| Chính sách tồn kho | Chốt rõ khi M5 cập nhật/giữ tồn và khi `PAYMENT_FAILED`, hủy hoặc timeout thì giải phóng/kiểm tra lại ra sao; bảo đảm không bán vượt tồn hoặc trừ tồn vĩnh viễn. | **Cần chốt trước khi code/test** |
| Ghi Loyalty lỗi sau PAID | Có cơ chế thử lại idempotent (hoặc outbox) mà không tạo thêm thanh toán/điểm. | Chờ nhóm duyệt |
| Điều kiện đo NFR | Giữ các đề xuất hiệu năng và viewport ở SRS Mục 8; UC-18 không tự thay ngưỡng NFR. | Chờ nhóm duyệt |

**Điểm cần rà soát chéo:** SRS Mục 6 nói UC-18 “dành trước, chưa vẽ một oval độc lập” trong **sơ đồ tổng quát**; tài liệu Task 1.3 dùng UC-18 làm oval trung tâm trong **sơ đồ trọng tâm**, không mâu thuẫn. Bản Task 1.1 trên máy nếu đã khác bản lưu trước đây, cần so lại IS/EX/OS trước khi nhóm phê duyệt.

## 13. Kết luận

UC-18 bao quát happy path, luồng thay thế và các lỗi có thể kiểm thử theo Task 1.3 Assignment 2, đồng thời truy vết được về FR/NFR và phạm vi Task 1.1. Những chính sách kỹ thuật chưa được hai đề quy định chi tiết được tách thành đề xuất ở Mục 12; tài liệu chỉ được khóa sau khi nhóm xác nhận các chính sách đó và rà soát sơ đồ/ảnh kết xuất thực tế.
