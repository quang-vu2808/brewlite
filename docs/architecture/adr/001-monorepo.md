# ADR-001 – Monorepo

**Status:** Proposed (chưa được nhóm phê duyệt)  
**Phạm vi:** Task 3.1, BrewLite

## Context

Nhóm có frontend Next.js, API NestJS, tài liệu và kiểm thử cần cùng lịch sử yêu cầu/PR.

## Decision (đề xuất)

Dùng một repository với `apps/web`, `apps/api`, `docs`, `tests` và workflows, không đồng nghĩa ép mọi package dùng cùng dependency/version.

## Alternatives Considered

Multi-repo theo từng ứng dụng; monorepo nhiều package phức tạp hơn.

## Rationale

Dễ truy vết FR→thiết kế→code/test, PR tích hợp đồng bộ và cấu trúc đã được khởi tạo; ít overhead phối hợp.

## Consequences / Trade-offs

Ưu: thay đổi đồng bộ; hạn: CI có thể chạy việc không liên quan và phân quyền theo repo kém mịn; cần CODEOWNERS/PR review khi lớn.

## Related Requirements

NFR-06, NFR-08, NFR-10; IS-10. Xem [tài liệu kiến trúc tổng thể](../architecture.md).
