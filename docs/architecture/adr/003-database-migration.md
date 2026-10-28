# ADR-003 – PostgreSQL và Migration

**Status:** Proposed (chưa được nhóm phê duyệt)  
**Phạm vi:** Task 3.1, BrewLite

## Context

Assignment 2 bắt buộc PostgreSQL/migration; FR-17 cần transaction và optimistic locking.

## Decision (đề xuất)

PostgreSQL với migration có phiên bản trong Git; đề xuất Prisma để model/type và migration; transaction ngắn, version/CAS cho Product, unique constraints cho payment key và loyalty/order; seed riêng. Prisma chỉ được dùng sau khi nhóm duyệt.

## Alternatives Considered

TypeORM; SQL migration thuần.

## Rationale

Phù hợp TypeScript và schema review; PostgreSQL cung cấp ràng buộc và transaction.

## Consequences / Trade-offs

Ưu: tái tạo và truy vết schema; hạn: migration sai có rủi ro dữ liệu, optimistic locking cần test concurrency; ORM không thay thế hiểu biết transaction.

## Related Requirements

FR-09, FR-15–FR-19, NFR-07; UC-18. Xem [tài liệu kiến trúc tổng thể](../architecture.md).
