# ADR-005 – JWT Authentication

**Status:** Proposed (chưa được nhóm phê duyệt)  
**Phạm vi:** Task 3.1, BrewLite

## Context

FR-07/08 và NFR-02/03 yêu cầu tài khoản, JWT, route bảo vệ; checkout phải ngăn xem/chi trả đơn của người khác.

## Decision (đề xuất)

NestJS Auth module hash mật khẩu, ký/kiểm JWT, Guards và ownership checks cho Order/Payment/History; frontend không tin token như chứng cứ về giá hay quyền. Đề xuất cookie HttpOnly, Secure, SameSite cho trình duyệt với CSRF thích hợp, cần nhóm chốt.

## Alternatives Considered

Server-side session; token JS-readable localStorage; external identity provider.

## Rationale

JWT là yêu cầu đề; ownership/server validation giúp tránh phụ thuộc UI; cookie giảm phơi token trước JS nhưng kéo theo CSRF cần xử lý.

## Consequences / Trade-offs

Ưu: API bảo vệ tập trung; hạn: vòng đời/thu hồi token và CSRF/CORS cần thiết kế và test kỹ.

## Related Requirements

FR-07–FR-09, FR-13; NFR-02–NFR-04; UC-18. Xem [tài liệu kiến trúc tổng thể](../architecture.md).
