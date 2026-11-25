# Research: Bug mà database không có lỗi (timezone-utc, junior)

Nguồn bên dưới là tài liệu chính thức nhưng **UNVERIFIED trong phiên này**: chưa fetch lại để đối chiếu từng câu. Owner nên soát trước khi publish.

- PostgreSQL Documentation: Date/Time Types: https://www.postgresql.org/docs/current/datatype-datetime.html
- MySQL Reference Manual: The DATE, DATETIME, and TIMESTAMP Types: https://dev.mysql.com/doc/refman/8.4/en/datetime.html
- IANA Time Zone Database: https://www.iana.org/time-zones
- RFC 5545: iCalendar (recurrence rules): https://www.rfc-editor.org/rfc/rfc5545

## Claims

- Vào mùa đông New York là UTC−5, nên 9:00 New York = 14:00 UTC (01/12/2026, 01/02/2027); Hà Nội UTC+7 = 21:00. Đã tính bằng Python zoneinfo trong bản nháp của owner (V1), chưa chạy lại trong repo.
- Berlin 22/03/2027 9:00 = 08:00 UTC; sau khi chuyển giờ (28/03/2027, Chủ nhật) 29/03 và 05/04 9:00 = 07:00 UTC; giữ 08:00 UTC thì 29/03 hiện 10:00 (V2, V3, của owner, chưa chạy lại).
- PostgreSQL `timestamptz` đổi về UTC khi lưu, đọc lại theo TimeZone của phiên, không lưu tên múi giờ gốc: UNVERIFIED (V4 chưa chạy).
- MySQL `TIMESTAMP` đổi về UTC khi lưu, `DATETIME` giữ nguyên con số: UNVERIFIED (V5 chưa chạy). Giới hạn năm 2038 của TIMESTAMP (chỉ ở bình luận ghim): V6 chưa chạy.
- Giờ không tồn tại / giờ lặp (28/03/2027 và 31/10/2027, 02:30 Berlin) và quy ước iCalendar: V7 chưa chạy.
- V8 (Mexico bỏ giờ mùa hè) đã bỏ khỏi đáp án, không đưa vào video.

Owner đã quyết định bỏ qua bước kiểm chứng V4–V7 cho video này.

## Code đã chạy

Không có code chạy trong video này; các thẻ chỉ hiển thị tên kiểu dữ liệu, không phải mã cần chạy.

## Số minh hoạ

- Mọi giờ trong video (09:00, 14:00 UTC, 08:00 UTC, ngày 28/03/2027) là ví dụ tính tay từ luật múi giờ, không phải số đo.

## Điều chỉnh trình bày

- Thẻ cảnh 3 rút `MySQL DATETIME -- chỉ con số, không múi giờ` và bỏ dòng "14:00 UTC → Hà Nội 21:00" (lời đọc vẫn nói); owner đã duyệt.
- Dấu ✔ ✘ thay bằng icon SVG (`check`, `cross`); căn cột bằng khoảng trắng của bản gốc chuyển thành `label` + `text`.
- Dòng code cảnh 3 dùng hai khoảng trắng trước `--` thay cho căn cột dài.

## Phụ (không đưa vào video)

Caption TikTok, bình luận ghim và chữ ảnh bìa nằm ở `notes/script-v1.md`; ảnh bìa đã chốt: `notes/cover.png`.
