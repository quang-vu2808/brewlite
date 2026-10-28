# ADR-004 – Mock Payment Adapter và Idempotency

**Status:** Proposed (chưa được nhóm phê duyệt)  
**Phạm vi:** Task 3.1, BrewLite

## Context

Đề chỉ yêu cầu Ví/Thẻ mô phỏng, phải bảo đảm không xử lý thanh toán trùng, đúng trạng thái và loyalty.

## Decision (đề xuất)

Payment module dùng PaymentPort/Mock adapter; lưu key+fingerprint+status với uniqueness; tách DB transaction khỏi lời gọi mock; trạng thái PAID/FAILED chỉ theo kết quả đã ghi; retry key cũ cho cùng request, retry mới khi failed đã xác minh; ownership kiểm tra server. Chính sách key retention/timeout còn chờ nhóm duyệt.

## Alternatives Considered

Client tự giả lập success; gọi gateway thật; mock logic trộn trực tiếp vào OrderService.

## Rationale

Tái tạo được nhánh success/failure/timeout phục vụ test, không có tiền thật, giữ business logic độc lập adapter.

## Consequences / Trade-offs

Ưu: dễ test/idempotent; hạn: chưa phản ánh đủ semantics/payment callbacks thực tế; tồn kho lúc failure/timeout cần chính sách thống nhất.

## Related Requirements

FR-09–FR-12, FR-15–FR-19; UC-18. Xem [tài liệu kiến trúc tổng thể](../architecture.md).
