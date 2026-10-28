# ADR-006 – Configuration, Logging và Health

**Status:** Proposed (chưa được nhóm phê duyệt)  
**Phạm vi:** Task 3.1, BrewLite

## Context

Đề yêu cầu logging/health/config, CI/CD và secret không lộ; demo cần tìm nguyên nhân lỗi rõ.

## Decision (đề xuất)

Config qua environment có validation, `.env.example` không secret; structured logging với correlation id và redaction; global exception filter; `GET /health` có liveness/readiness thích hợp; không public thông tin nội bộ nhạy cảm.

## Alternatives Considered

Hardcode config; log tùy tiện; chỉ kiểm tra homepage thay health endpoint.

## Rationale

Môi trường local/CI/prod tái lập; log hỗ trợ test/debug; health hỗ trợ smoke checks.

## Consequences / Trade-offs

Ưu: quan sát/truy lỗi và tránh lộ secret; hạn: phải quản trị log retention và health dependency để không làm lộ hạ tầng.

## Related Requirements

NFR-04, NFR-07–NFR-10; Assignment 2 mục 5.1. Xem [tài liệu kiến trúc tổng thể](../architecture.md).
