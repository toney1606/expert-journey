# n-plus-one-query — script v1 (v2)

Chủ đề: N+1 query với ORM. Level junior, Day 2 19:30 của series. Chưa tts, chưa render; chờ owner duyệt script + ảnh bìa. Nội dung dựng từ gợi ý của owner, **đã bỏ "0,1 giây / 8 giây"** vì không đo được; hook dùng số đếm thật (100 đơn → 101 query).

## Cảnh (v2, 6 cảnh, ~250 từ lời đọc)

1. `slow-page` (VẤN ĐỀ): Một trăm đơn hàng, mà trang chạy một trăm lẻ một câu query. Máy bạn mượt, production chậm. Bật log: chuyện gì đang xảy ra?
2. `lazy-loading` (CƠ CHẾ): ORM là thư viện giúp gọi database bằng code. Dòng đầu lấy 100 đơn = 1 query; mỗi lần code hỏi "đơn này của ai" ORM chạy thêm 1 query (lazy loading: chạm tới mới tải).
3. `n-plus-one` (TÊN GỌI): 100 đơn thêm 100 query, 1 + 100 = 101. Dân làm nghề gọi là lỗi N + 1 (N là số đơn, +1 là query lấy danh sách).
4. `eager-fix` (CÁCH SỬA): eager loading, cách 1 nối hai bảng bằng JOIN (1 query), cách 2 gom hết id rồi IN (2 query).
5. `why-prod` (VÌ SAO): máy dev vài đơn, database cùng máy; production mỗi query là một chuyến đi qua mạng, như đi siêu thị mua 100 món mà đi 100 chuyến; 200 đơn = 201 query; bắt sớm bằng log / test đếm query.
6. `interview-question` (THỬ THÁCH): 10 đơn hàng, lazy loading: bao nhiêu query? Vì sao gọi là N + 1? Sửa thế nào, bắt thế nào? Kêu gọi trả lời ở bình luận ghim.

## Chữ ảnh bìa (đề xuất)

100 đơn hàng (vàng) / 101 (đỏ) câu query (trắng), cùng hero cảnh 1. Ảnh bìa đã làm xong: `notes/cover.png` (1080x1920, owner đã xem lại bản sửa, bỏ chấm đỏ lẻ).

## Caption TikTok

Một trăm đơn hàng, mà trang chạy một trăm lẻ một câu query ⚡ Code không lỗi, database không lỗi, chỉ là ORM đang lười tải sau lưng bạn.
Câu dễ gặp khi phỏng vấn Backend: danh sách 10 đơn hàng, mỗi đơn có người dùng, lazy loading chạy bao nhiêu query? Sửa thế nào?
Đáp án ở bình luận ghim 👇
#phongvandev #backend #database #orm #nplus1 #phỏngvấnit

## Bình luận ghim

Đáp án: 11 query. Một query lấy 10 đơn, rồi 10 query lấy từng người dùng khi vòng lặp chạm vào. Đó là N+1 (N = 10).

1) Vì sao máy dev không thấy: ít dữ liệu, database cùng máy. Production thì mỗi query là một chuyến đi qua mạng và số query tăng theo số đơn (200 đơn → 201 query).

2) Cách sửa: eager loading.
- JOIN: 1 query (SELECT o.*, u.name FROM orders o JOIN users u ON u.id = o.user_id). Đơn không có user thì dùng LEFT JOIN.
- Gom id rồi IN: 2 query, hợp với quan hệ một-nhiều (JOIN sẽ nhân bản dòng cha). Id quá nhiều thì chia lô.
- Số query không đổi khi số đơn tăng (đã chạy test: 10, 100, 200 đơn đều 1 hoặc 2 query).

3) Hay bị hỏi vặn:
- Phát hiện thế nào? Bật log câu lệnh của ORM/database, hoặc viết test đếm số query của trang.
- Eager loading mọi thứ có tốt không? Không, kéo cả dữ liệu không dùng; chỉ tải thứ trang cần.
- ORM có identity map thì sao? Trùng user có thể không bị hỏi lại, nhưng user khác nhau vẫn thành N query. Demo trong video cho mỗi đơn một user riêng.
- Thêm cache hay thêm server? Che triệu chứng, không giảm số query.

## Việc kiểm chứng

Số query (11, 101, 201; 1 và 2 cho hai cách sửa) đã chạy trong test `code/n-plus-one-demo.test.ts` (SQLite, ORM lazy-loading tối giản tự viết). Không có số thời gian nào. Nguồn tài liệu ORM chưa đối chiếu từng câu (UNVERIFIED, xem `research.md`).
