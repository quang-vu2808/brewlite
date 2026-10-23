# TASK 1.1 – BỐI CẢNH, STAKEHOLDER VÀ PHẠM VI DỰ ÁN

## 1. Mục đích tài liệu

Tài liệu xác định bối cảnh nghiệp vụ, các bên liên quan, mục tiêu, phạm vi và điều kiện triển khai của BrewLite. Đây là cơ sở để nhóm thống nhất giới hạn sản phẩm trước khi xây dựng đặc tả yêu cầu phần mềm (SRS), mô hình hóa, thiết kế, lập trình và kiểm thử ở các task tiếp theo.

BrewLite trong Assignment 2 kế thừa đề tài và nghiệp vụ từ đề BrewLite gốc. Các mục ghi ** phản ánh yêu cầu hoặc định hướng nêu trong hai đề bài; các mục ghi **[Đề xuất]** là cách cụ thể hóa của nhóm, cần được xác nhận trước khi chốt phạm vi.

## 2. Bối cảnh và vấn đề nghiệp vụ

### 2.1. Bối cảnh

 BrewLite là ứng dụng hỗ trợ khách hàng lựa chọn, đặt và thanh toán đồ uống theo hình thức không dùng tiền mặt. Định hướng sản phẩm là giúp khách hàng thực hiện thao tác đặt hàng thuận tiện, giảm thời gian xếp hàng và nhận đơn nhanh tại quầy.

Luồng nghiệp vụ tối thiểu trong Assignment 2 là:

**Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn.**

Hệ thống có giao diện hướng mobile-first/PWA, xử lý nghiệp vụ qua API và lưu trữ thông tin cần thiết trong cơ sở dữ liệu.

### 2.2. Vấn đề nghiệp vụ cần giải quyết

 Nếu khách hàng phải tìm hiểu menu, lựa chọn tùy chọn và đặt đồ uống trực tiếp tại quầy, quá trình đặt hàng có thể mất thời gian, đặc biệt khi lượng khách tăng. Việc truyền đạt lựa chọn size, topping, số lượng và tổng tiền bằng thao tác thủ công cũng có nguy cơ thiếu nhất quán. Khách hàng cần biết kết quả thanh toán và tình trạng đơn hàng sau khi đặt.

BrewLite hướng đến giải quyết các nhu cầu đó thông qua một luồng đặt hàng có cấu trúc, hiển thị rõ thông tin sản phẩm, tổng tiền, trạng thái thanh toán và đơn hàng. Trong phạm vi bài tập, giao dịch Ví/Thẻ được **mô phỏng**, không phải giao dịch tài chính thực tế.

### 2.3. Mục tiêu sản phẩm

- Cho phép khách hàng xem menu, chi tiết và tùy chọn đồ uống.
- Hỗ trợ quản lý giỏ hàng, tính tổng tiền và tạo đơn hàng.
- Hỗ trợ đăng ký, đăng nhập và xác thực bằng JWT.
- Mô phỏng thanh toán không dùng tiền mặt qua Ví/Thẻ; thông báo thành công hoặc thất bại.
- Hiển thị mã đơn, trạng thái và lịch sử đơn để khách hàng theo dõi.
- Xây dựng sản phẩm có thể kiểm thử, chạy tại máy cục bộ và triển khai trên môi trường production có thể truy cập.

## 3. Các bên liên quan (Stakeholders)

**[Theo đề về thành phần stakeholder; mục tiêu/kỳ vọng được diễn giải cụ thể để phục vụ phân tích]**

| Mã | Stakeholder | Vai trò đối với hệ thống | Mục tiêu | Kỳ vọng |
| --- | --- | --- | --- | --- |
| ST-01 | Khách hàng (Customer) | Người dùng trực tiếp đặt đồ uống | Xem sản phẩm, chọn size/topping, quản lý giỏ, đặt và thanh toán đơn, theo dõi đơn | Giao diện dễ sử dụng trên điện thoại; giá và tổng tiền minh bạch; nhận phản hồi rõ ràng về đơn và thanh toán |
| ST-02 | Nhân viên quầy/Barista | Bên liên quan trong quy trình chuẩn bị và giao đồ uống | Nắm được thông tin đơn và trạng thái xử lý | Thông tin đơn chính xác; khi mở rộng có thể tiếp nhận đơn, cập nhật trạng thái pha chế qua giao diện riêng |
| ST-03 | Quản lý cửa hàng/Product Owner | Đại diện nghiệp vụ, xác định ưu tiên sản phẩm và nghiệm thu increment | Đảm bảo hệ thống hỗ trợ luồng đặt hàng và đáp ứng phạm vi đã thống nhất | Yêu cầu rõ ràng, kết quả theo từng Sprint có thể kiểm tra, lịch sử quyết định được ghi nhận |
| ST-04 | Giảng viên/khách hàng nghiệm thu | Đánh giá quá trình và sản phẩm bài tập lớn | Kiểm tra mức độ đáp ứng yêu cầu của đề và tính liên tục từ yêu cầu đến triển khai | Có tài liệu, sơ đồ, mã nguồn, kiểm thử, lịch sử Git và bản production/demo phù hợp tiêu chí đề bài |
| ST-05 | Nhóm phát triển (Development Team) | Phân tích, thiết kế, lập trình, kiểm thử, triển khai và bàn giao | Hoàn thành sản phẩm theo kế hoạch và phân công | Phạm vi được thống nhất; có tiêu chí nghiệm thu rõ; môi trường phát triển và repository dùng chung |
| ST-06 | Đơn vị/dịch vụ thanh toán (Payment Service) | Thành phần tích hợp thanh toán; trong bài tập là dịch vụ giả lập | Trả kết quả xử lý thanh toán Ví/Thẻ mô phỏng | Giao tiếp API rõ ràng; xử lý được thành công, thất bại và yêu cầu lặp mà không tạo thanh toán trùng |

**Lưu ý:** Nhân viên quầy là stakeholder của nghiệp vụ dù giao diện vận hành riêng của họ chưa thuộc MVP theo cách phân định phạm vi đề xuất ở Mục 4–5.

## 4. Phạm vi MVP (In-scope)

 MVP hoàn chỉnh là phiên bản tối thiểu có thể vận hành luồng nghiệp vụ chính, không phải chỉ là giao diện tĩnh. Các hạng mục được triển khai dần trong hai Sprint của Assignment 2.

| Mã | Hạng mục trong phạm vi MVP | Mô tả kết quả mong đợi | Cơ sở |
| --- | --- | --- | --- |
| IS-01 | Menu đồ uống | Xem danh sách với tên, hình ảnh và giá | Đề gốc, mục 4 và Backlog; Assignment 2, Task 4 |
| IS-02 | Chi tiết và tùy chọn sản phẩm | Xem chi tiết, chọn size và topping, thể hiện giá tương ứng | Đề gốc; Assignment 2, Task 5.1 |
| IS-03 | Giỏ hàng | Thêm, sửa số lượng, xóa sản phẩm và tính tổng tiền | Cả hai đề |
| IS-04 | Tài khoản và xác thực | Đăng ký, đăng nhập, bảo vệ thao tác cần xác thực bằng JWT | Cả hai đề |
| IS-05 | Đặt hàng | Xác thực/kiểm tra dữ liệu và tạo đơn hàng với mã đơn, tổng tiền và trạng thái | Cả hai đề |
| IS-06 | Thanh toán mô phỏng | Chọn Ví/Thẻ; xử lý nhánh thành công, thất bại; không giao dịch tiền thật | Cả hai đề |
| IS-07 | Xác nhận và lịch sử đơn | Hiển thị mã đơn, kết quả thanh toán, trạng thái và lịch sử đơn của khách hàng | Cả hai đề |
| IS-08 | Theo dõi và quản lý trạng thái đơn | Lưu và thể hiện trạng thái đơn; Backend kiểm soát chuyển trạng thái hợp lệ | Assignment 2, luồng tối thiểu/SRS; đề gốc Task 10 |
| IS-09 | Xử lý nghiệp vụ Backend nâng cao | Idempotency thanh toán, kiểm soát tồn kho khi đặt đồng thời, khuyến mãi và điểm thưởng | Đề gốc, Task 10; các sơ đồ/kiểm thử liên quan trong Assignment 2 |
| IS-10 | Kiểm thử và khả năng triển khai | Có kiểm thử phù hợp, migration/seed, Docker Compose, CI/CD, health check và bản production có thể truy cập | Assignment 2, Task 4–5 |

**Phân kỳ thực hiện:** Sprint 1 của Assignment 2 tập trung vào nền tảng và luồng xem menu. Sprint 2 hoàn thiện luồng end-to-end cùng kiểm thử, CI/CD và delivery. Không hiểu danh sách MVP ở trên là toàn bộ chức năng phải hoàn thành ngay trong Sprint 1.

## 5. Phạm vi mở rộng (Extension scope)

| Mã | Hạng mục | Mô tả | Phân loại |
| --- | --- | --- | --- |
| EX-01 | Giao diện riêng cho nhân viên quầy/Barista | Tiếp nhận đơn và thao tác cập nhật trạng thái pha chế trên giao diện nhân viên, thay vì chỉ có xử lý trạng thái ở Backend | Đề gốc xác định chức năng nhân viên quầy ngoài MVP; cách tách giao diện và Backend là đề xuất cụ thể hóa |
| EX-02 | Trang quản trị menu chuyên biệt | Cho phép người quản lý chỉnh sửa menu qua một giao diện riêng | Đề xuất bổ sung, không phải yêu cầu trực tiếp của hai đề |
| EX-03 | Thông báo chủ động | Gửi thông báo khi trạng thái đơn thay đổi qua email hoặc push notification | Đề xuất bổ sung, không phải yêu cầu trực tiếp của hai đề |

Các mục mở rộng không được ưu tiên thay thế bất kỳ yêu cầu bắt buộc nào thuộc MVP. Chỉ triển khai khi nhóm còn nguồn lực và đã thống nhất phạm vi.

## 6. Ngoài phạm vi (Out-of-scope)

**[Đề xuất giới hạn để tránh mở rộng dự án ngoài yêu cầu; không đồng nghĩa với việc đề bài cấm thực hiện]**

| Mã | Nội dung không thực hiện trong bản bàn giao | Lý do |
| --- | --- | --- |
| OS-01 | Tích hợp cổng thanh toán tiền thật và xử lý giao dịch tài chính thực tế | Hai đề yêu cầu/cho phép thanh toán mô phỏng; giảm phụ thuộc tài khoản, pháp lý và phí dịch vụ thực tế |
| OS-02 | Hệ thống giao hàng, định vị tài xế và theo dõi vận chuyển | Luồng sản phẩm tập trung vào đặt đồ uống và nhận tại quầy |
| OS-03 | Quản lý nhiều chi nhánh hoặc mô hình nhượng quyền | Chưa thuộc luồng nghiệp vụ tối thiểu |
| OS-04 | Ứng dụng native độc lập cho Android/iOS | Assignment 2 yêu cầu Next.js hướng mobile-first/PWA |
| OS-05 | Hệ thống kế toán, hóa đơn điện tử và đối soát ngân hàng thực tế | Vượt ngoài mục tiêu thanh toán giả lập của bài tập |

**Không xếp** lịch sử đơn, quản lý trạng thái, idempotency, kiểm soát tồn kho, khuyến mãi và điểm thưởng vào Out-of-scope vì các nội dung này được đề cập ở hai đề bài.

## 7. Giả định ban đầu (Assumptions)

| Mã | Giả định | Ảnh hưởng nếu giả định không đúng |
| --- | --- | --- |
| AS-01 | Nhóm sử dụng dữ liệu đồ uống mẫu/seed để phát triển và kiểm thử | Phải bổ sung nguồn dữ liệu và bước chuẩn bị trước khi kiểm thử |
| AS-02 | Payment Service giả lập có thể cung cấp kết quả thanh toán thành công và thất bại | Không kiểm thử được đầy đủ các nhánh nghiệp vụ |
| AS-03 | Khách hàng có trình duyệt và kết nối mạng để sử dụng website/PWA | Cần xem xét thêm yêu cầu sử dụng ngoại tuyến nếu được bổ sung |
| AS-04 | Nhóm được phép sử dụng GitHub và lựa chọn một nền tảng phù hợp để triển khai bản demo | Cần thay đổi phương án lưu trữ hoặc triển khai |
| AS-05 | Đại diện nghiệp vụ/giảng viên có thể xác nhận những điểm phạm vi chưa rõ trong quá trình làm bài | Những quyết định chưa được xác nhận có thể dẫn đến phải sửa SRS và sơ đồ |

Các giả định trên là để quản trị dự án; không phải dữ kiện đã được giảng viên xác nhận.

## 8. Ràng buộc của dự án (Constraints)

| Mã | Ràng buộc | Nguồn |
| --- | --- | --- |
| CT-01 | Frontend sử dụng Next.js theo hướng mobile-first/PWA | Assignment 2, mục 1.1 |
| CT-02 | Backend sử dụng NestJS | Assignment 2, mục 1.1 |
| CT-03 | Dữ liệu lưu trong PostgreSQL; không thay thế ba thành phần Next.js, NestJS, PostgreSQL bằng công nghệ khác | Assignment 2, mục 1.1 |
| CT-04 | Có Docker/Compose, kiểm thử, CI/CD và bản production theo các yêu cầu từng Task | Assignment 2, Task 4–5 |
| CT-05 | Năm Task của Assignment 2 phải hoàn thành tuần tự; tạo phẩm bắt buộc có trên repository và có lịch sử thay đổi rõ ràng | Assignment 2, mục 1 |
| CT-06 | Task 1.1 phải được lưu tại `docs/requirements/context-and-scope.md` | Assignment 2, mục 3.1 |
| CT-07 | Giải pháp thanh toán cho bài tập dùng Ví/Thẻ mô phỏng; không yêu cầu giao dịch thật | Đề gốc và Assignment 2 |
| CT-08 | Nhóm phải dành thời gian và nhân lực hữu hạn cho tài liệu, phát triển, kiểm thử, triển khai và demo | [Đề xuất] Ràng buộc quản lý, cần bổ sung deadline/phân công thực tế sau khi thống nhất |

## 9. Rủi ro ban đầu và hướng xử lý

**[Đề xuất phân tích rủi ro; Assignment 2 yêu cầu có rủi ro ban đầu nhưng không áp đặt mẫu bảng hoặc mức đánh giá cụ thể]**

| Mã | Rủi ro | Mức độ dự kiến | Hướng xử lý đề xuất |
| --- | --- | --- | --- |
| R-01 | Hiểu khác nhau về phạm vi giữa đề gốc và Assignment 2 | Cao | Lấy yêu cầu Assignment 2 làm chuẩn nghiệm thu bài tiếp nối; đối chiếu đề gốc và ghi quyết định phạm vi bằng văn bản |
| R-02 | Phạm vi công việc vượt thời gian/nguồn lực nhóm | Cao | Ưu tiên tạo phẩm bắt buộc và luồng MVP; không làm extension trước khi hoàn thành phần bắt buộc |
| R-03 | SRS, sơ đồ và code không nhất quán | Cao | Thống nhất thuật ngữ, cập nhật tài liệu qua Git/PR và lập ma trận truy vết theo Assignment 2 |
| R-04 | Trùng giao dịch khi gửi lại yêu cầu thanh toán | Cao | Thiết kế idempotency và kiểm thử yêu cầu gửi lặp theo đề gốc Task 10 |
| R-05 | Đặt đồng thời dẫn đến vượt tồn kho | Cao | Sử dụng transaction và optimistic locking theo đề gốc Task 10; có kiểm thử đồng thời |
| R-06 | Chậm tích hợp Frontend–Backend hoặc lỗi cấu hình môi trường | Trung bình | Thống nhất API, dùng `.env.example`, kiểm tra tích hợp sớm và chạy Docker Compose |
| R-07 | CI/CD hoặc production không hoạt động lúc nghiệm thu | Cao | Chạy thử pipeline, health check và smoke test; chuẩn bị rollback, kiểm tra URL trước bàn giao |
| R-08 | Lộ secret trong repository hoặc log | Cao | Dùng environment variables/CI secrets, không commit `.env` chứa thông tin nhạy cảm |

*Mức độ trên là đánh giá sơ bộ của nhóm, chưa phải kết quả đo lường định lượng.*

## 10. Các quyết định nhóm cần thống nhất trước khi chốt phiên bản 1.0

Các câu hỏi sau **không phải phần thiếu của đề bài**, mà là các quyết định triển khai cụ thể cần ghi nhận để tránh mâu thuẫn trong SRS, sơ đồ và code:

1. **Giao diện nhân viên:** Thống nhất MVP chỉ bắt buộc có dữ liệu/theo dõi và quy tắc trạng thái đơn; giao diện riêng để Barista thao tác thuộc extension, hay nhóm muốn đưa vào phạm vi thực hiện thêm?
2. **Cách mô phỏng trạng thái đơn:** Nhóm chọn phương án cập nhật trạng thái để demo/kiểm thử mà không mặc nhiên xem việc có một giao diện Barista hoàn chỉnh là yêu cầu bắt buộc của MVP.
3. **Thanh toán:** Xác nhận sử dụng mock payment Ví/Thẻ, tuyệt đối không xử lý tiền thật.
4. **Task 10 của đề gốc:** Phân công thực hiện đủ state machine, idempotency, kiểm soát tồn kho khi đặt đồng thời, khuyến mãi/điểm thưởng; thống nhất các quy tắc chi tiết ở Task 1.2 và thiết kế tiếp theo.
5. **Nền tảng triển khai:** Chọn một nền tảng production khả thi trước khi chốt Deployment Diagram; không ghi một nền tảng là đã lựa chọn nếu nhóm chưa quyết định.
6. **Deadline và người phụ trách:** Cập nhật theo thông báo thực tế của giảng viên và quyết định của nhóm; không tự giả định thời hạn trong đề.

## 11. Cơ sở đối chiếu đề bài

- **BrewLite – đề gốc, phiên bản 1.0:** Mục 1 (Tóm tắt), mục 3 (Product Vision và Stakeholders), mục 4 (Requirements), mục 5 (luồng nghiệp vụ), mục 8–9 (Product Backlog và Task 10), mục 12 (API và thực thể tối thiểu).
- **BrewLite – Assignment 2, phiên bản 1.0:** Mục 1–1.1 (phạm vi và quy tắc tuần tự), mục 3.1 (Task 1.1), mục 3.2 (nhóm yêu cầu tối thiểu trong SRS), mục 4–7 (những yêu cầu phải được tính đến khi xác định phạm vi), mục 8–9 (truy vết và cấu trúc repository).

> Tài liệu này hoàn thành bước xác định bối cảnh và phạm vi. Danh sách FR/NFR có mã, mức ưu tiên MoSCoW, tiêu chí chấp nhận và Use Case Diagram tổng quát sẽ được đặc tả riêng ở Task 1.2, không thuộc nội dung phải hoàn thiện ngay trong Task 1.1.
