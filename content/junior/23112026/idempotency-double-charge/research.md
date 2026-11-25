# Research: Bấm thanh toán hai lần, bị trừ hai lần (idempotency-double-charge, junior)

Nguồn bên dưới là tài liệu chính thức nhưng **UNVERIFIED trong phiên này**: chưa fetch lại để đối chiếu từng câu. Owner nên soát trước khi publish.

- Stripe API: Idempotent requests: https://docs.stripe.com/api/idempotent_requests
- MDN: Idempotent: https://developer.mozilla.org/en-US/docs/Glossary/Idempotent
- PostgreSQL Documentation: Unique Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS

## Claims

- Client timeout không cho biết server đã xử lý hay chưa; retry không kèm mã làm server tạo yêu cầu mới — UNVERIFIED fetch (mô tả cơ chế, không phải trích nguồn).
- Idempotency key: client sinh mã, gửi kèm; server lưu mã và kết quả, gặp lại mã thì trả kết quả cũ (Stripe, "Idempotent requests") — UNVERIFIED fetch.
- Ràng buộc UNIQUE trên cột mã khiến database từ chối dòng thứ hai (PostgreSQL, "Unique Constraints") — UNVERIFIED fetch.
- "Nhiều cổng thanh toán hỗ trợ sẵn cơ chế này": ví dụ Stripe; chưa kiểm các cổng khác, nên lời đọc để chung chung.
- SELECT rồi INSERT lọt vì hai yêu cầu cùng SELECT trước khi bên nào INSERT (race condition kiểu check-then-act). Đáp án đúng để ghim ở bình luận: dựa vào ràng buộc UNIQUE (hoặc INSERT ... ON CONFLICT) thay vì kiểm tra rồi mới ghi.

## Code đã chạy

`code/idempotency-demo.ts` + test (`pnpm test`) chạy trên SQLite (`node:sqlite`): retry không mã trừ hai lần; kiểm tra trong code trừ một lần; hai SELECT xen trước hai INSERT cho hai dòng; unique index từ chối dòng thứ hai.
**Lưu ý:** câu `ALTER TABLE ... ADD CONSTRAINT ... UNIQUE` trong video là cú pháp PostgreSQL; SQLite không có `ADD CONSTRAINT`, nên test chạy `CREATE UNIQUE INDEX` (cùng tác dụng) và chỉ so khớp chuỗi `ALTER TABLE` với `video.json`. Chưa chạy câu `ALTER` trên PostgreSQL thật.

## Số minh hoạ

- `500.000đ` và mã `a1b2-c3d4` là minh hoạ, không phải số đo.
- Không có số đo nào trong video này.

## Điều chỉnh trình bày

- Câu SQL xuống dòng khác bản gốc của owner (thêm xuống dòng sau `ADD CONSTRAINT`, `idempotency_key =`, và tách dòng chú thích) để mỗi dòng vừa thẻ 830px ở cỡ chữ code tối thiểu, không bị bẻ giữa tên.
- Dấu `✓` và emoji `👇` được thay bằng icon SVG (dấu tích, ghim) vì font của video không có glyph.
