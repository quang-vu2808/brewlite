# ADR-002 – Layered Modular Monolith

**Status:** Proposed (chưa được nhóm phê duyệt)  
**Phạm vi:** Task 3.1, BrewLite

## Context

Order, Payment, Product, Promotion, Loyalty liên quan chặt và cần transaction/tính nhất quán trong quy mô học phần.

## Decision (đề xuất)

Chọn NestJS Modular Monolith; tách API/presentation, application, domain và infrastructure; chỉ application điều phối checkout; module boundary và interface rõ.

## Alternatives Considered

Microservices Order/Payment; một monolith không phân module.

## Rationale

Tránh điều phối giao dịch phân tán và hạ tầng nhiều service, vẫn kiểm thử domain và phân công module được.

## Consequences / Trade-offs

Ưu: triển khai đơn giản, transaction thuận lợi; hạn: scale/deploy chung, dễ coupling nếu không kiểm soát import.

## Related Requirements

FR-01–FR-19, NFR-06–NFR-09; UC-18. Xem [tài liệu kiến trúc tổng thể](../architecture.md).
