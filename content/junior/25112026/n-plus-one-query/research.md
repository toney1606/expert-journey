# Research: 100 đơn hàng, 101 câu query (n-plus-one-query, junior)

Nguồn bên dưới là tài liệu chính thức (đã kiểm URL trả về 200) nhưng **UNVERIFIED nội dung trong phiên này**: chưa đọc đối chiếu từng câu. Owner nên soát trước khi publish.

- Rails Guides: Active Record Query Interface, Eager Loading Associations: https://guides.rubyonrails.org/active_record_querying.html#eager-loading-associations
- Django: QuerySet API (`select_related`, `prefetch_related`): https://docs.djangoproject.com/en/stable/ref/models/querysets/
- SQLAlchemy 2.0: Relationship Loading Techniques: https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html

## Claims

- Lazy loading: quan hệ chỉ được tải khi code chạm tới nó; vòng lặp N phần tử chạm vào quan hệ của từng phần tử thì thêm N query, tổng N+1 (mô tả cơ chế chung của ORM, ba nguồn trên) — UNVERIFIED fetch.
- Sửa bằng eager loading: ORM tải quan hệ trước, bằng một câu JOIN (Rails `eager_load`, Django `select_related`, SQLAlchemy `joinedload`) hoặc một query `IN (...)` thứ hai (Rails `preload`, Django `prefetch_related`, SQLAlchemy `selectinload`) — UNVERIFIED fetch. Lời đọc nói chung chung "ORM", không nêu tên hàm của ORM nào.
- Vì sao máy dev không thấy: ít dữ liệu và database cùng máy, còn production mỗi query là một chuyến đi qua mạng, số query tăng theo số bản ghi. Đây là giải thích cơ chế, **không có số đo thời gian** trong video và không nêu "8 giây" hay "0,1 giây" (con số của bản gợi ý ban đầu, đã bỏ vì không đo được).
- Cách bắt sớm: bật log câu lệnh của ORM/database, hoặc test đếm số query của một trang (cách làm chung; mỗi ORM có công cụ riêng, không nêu tên).

## Code đã chạy

`code/n-plus-one-demo.ts` + test (`pnpm test`) trên SQLite (`node:sqlite`, in-memory) với một ORM lazy-loading tối giản tự viết (không phải ORM thật):

- Đoạn JS cảnh 2 (`lazy-loading`) được chạy nguyên văn trong test (qua `new Function`) và đếm đúng 101 câu lệnh cho 100 đơn, 11 cho 10 đơn, 201 cho 200 đơn.
- Bốn dòng log cảnh 1 (`slow-page`) (`Query 1`, `2`, `3`, `101`) khớp chính các câu lệnh mà vòng lặp chạy.
- Câu JOIN cảnh 4 (`eager-fix`) chạy 1 câu lệnh; cách gom id + `IN (...)` chạy 2 câu lệnh; cả hai trả cùng danh sách tên với bản lazy, và số câu lệnh không đổi khi số đơn tăng.
- `code/measure.ts` ghi `code/measurements.json` (số câu lệnh theo 10, 100, 200 đơn); test so khớp file này với lần đo mới.
- Cảnh `herocard` không có `testPath`; test đọc `video.json` để bảo đảm code hiển thị trùng code đã chạy.
- Khác biệt với ORM thật: ORM thật có thể có identity map hoặc cache khiến user trùng không bị hỏi lại (demo cho mỗi đơn một user riêng nên N+1 luôn đúng); `IN (...)` với danh sách id quá dài cần chia lô; `JOIN` trong demo là INNER JOIN, đơn không có user cần LEFT JOIN.

## Số minh hoạ

- Số đo thật (đếm câu lệnh, tất định): 100 đơn → 101 query lazy, 1 query JOIN, 2 query IN; 10 đơn → 11; 200 đơn → 201.
- Không có số nào khác trong video: không có thời gian, không có số mili giây.
- Tên cột/bảng (`orders`, `users`, `user-1`...) là minh hoạ.
- Ví dụ "đi siêu thị mua 100 món, đi 100 chuyến" (cảnh 5) là phép so sánh đời thường để giải thích mỗi query là một chuyến đi qua mạng, không phải số đo.
- "Lỗi N + 1" (cảnh 3): N = số đơn (100), +1 = query lấy danh sách; tên gọi phổ biến của vấn đề, cùng nguồn Rails/Django/SQLAlchemy ở trên (UNVERIFIED fetch).

## Điều chỉnh trình bày

- Bản gợi ý hook "0,1 giây trên máy bạn, 8 giây trên production" được thay bằng số đếm được ("một trăm đơn hàng, một trăm lẻ một câu query") để tuân thủ quy tắc không bịa số.
- Dấu ✔ thay bằng icon SVG (`mark: check`); căn cột dùng `label` + `text`, không dùng khoảng trắng.
- Câu JOIN xuống dòng sau `FROM orders o` / `JOIN users u` để mỗi dòng vừa thẻ ở cỡ chữ code tối thiểu.
- Bản v2 (sau review "dễ hiểu cho người xem"): giải thích ORM là gì ngay cảnh 2, tách cảnh 3 riêng để đặt tên lỗi N + 1 (video hỏi "vì sao gọi là N cộng một"), thêm ví dụ đi siêu thị ở cảnh 5, giải thích hai cách sửa bằng lời thường ("nối hai bảng", "gom hết id"), thêm câu kêu gọi bình luận cuối cảnh 6.
- Lời đọc không nói "o chấm user" mà nói "người dùng của đơn hàng"; "JOIN", "IN", "lazy loading", "eager loading" giữ tiếng Anh (nếu TTS đọc sai thì dùng respelling).
