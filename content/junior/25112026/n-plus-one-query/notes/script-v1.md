# n-plus-one-query — script v1 (v2)

Chủ đề: N+1 query với ORM. Level junior, Day 2 19:30 của series. Chưa tts, chưa render; chờ owner duyệt script + ảnh bìa. Nội dung dựng từ gợi ý của owner, **đã bỏ "0,1 giây / 8 giây"** vì không đo được; hook dùng số đếm thật (100 đơn → 101 query).

## Cảnh (v2, 6 cảnh, ~250 từ lời đọc)

1. `slow-page` (VẤN ĐỀ): Một trăm đơn hàng, mà trang chạy một trăm lẻ một câu query. Máy bạn mượt, production chậm. Bật log: chuyện gì đang xảy ra?
2. `lazy-loading` (CƠ CHẾ): ORM là thư viện giúp gọi database bằng code. Dòng đầu lấy 100 đơn = 1 query; mỗi lần code hỏi "đơn này của ai" ORM chạy thêm 1 query (lazy loading: chạm tới mới tải).
3. `n-plus-one` (TÊN GỌI): 100 đơn thêm 100 query, 1 + 100 = 101. Dân làm nghề gọi là lỗi N + 1 (N là số đơn, +1 là query lấy danh sách).
4. `eager-fix` (CÁCH SỬA): eager loading, cách 1 nối hai bảng bằng JOIN (1 query), cách 2 gom hết id rồi IN (2 query).
5. `why-prod` (VÌ SAO): máy dev vài đơn, database cùng máy; production mỗi query là một chuyến đi qua mạng, như đi siêu thị mua 100 món mà đi 100 chuyến; 200 đơn = 201 query; bắt sớm bằng log / test đếm query.
6. `interview-question` (THỬ THÁCH): một trang cần khách, sản phẩm và thẻ của sản phẩm. JOIN hay IN cho từng thứ? Cả trang cần bao nhiêu query? Kêu gọi trả lời ở bình luận ghim. (Chỉ đặt câu hỏi, đáp án nằm ở bình luận ghim.)

## Chữ ảnh bìa (đề xuất)

100 đơn hàng (vàng) / 101 (đỏ) câu query (trắng), cùng hero cảnh 1. Ảnh bìa đã làm xong: `notes/cover.png` (1080x1920, owner đã xem lại bản sửa, bỏ chấm đỏ lẻ).

## Caption TikTok

Một trăm đơn hàng, mà trang chạy một trăm lẻ một câu query ⚡ Code không lỗi, database không lỗi, chỉ là ORM đang lười tải sau lưng bạn.
Câu dễ gặp khi phỏng vấn Backend: một trang đơn hàng cần khách, sản phẩm và thẻ của sản phẩm. JOIN hay IN cho từng thứ? Cả trang cần bao nhiêu query?
Đáp án ở bình luận ghim 👇
#phongvandev #backend #database #orm #nplus1 #phỏngvấnit

## Bình luận ghim

Đáp án: 3 query.

Cách nghĩ: đứng ở một đơn hàng, nhìn sang bảng kia, thấy MỘT hay NHIỀU?
- Khách: mỗi đơn chỉ có 1 khách → JOIN thẳng vào câu lấy đơn. Số dòng vẫn bằng số đơn.
- Sản phẩm: mỗi đơn có nhiều sản phẩm → lấy riêng bằng IN (gom id của tất cả đơn, hỏi một lần).
- Thẻ: mỗi sản phẩm có nhiều thẻ → lấy riêng bằng IN (gom id của tất cả sản phẩm, hỏi một lần).
Tổng: 1 (đơn + khách) + 1 (sản phẩm) + 1 (thẻ) = 3 query. Sau đó ráp sản phẩm vào đơn, thẻ vào sản phẩm ngay trong code (xử lý mảng trong bộ nhớ, không gọi database).

Chỗ dễ nhầm: "đính vào danh sách đơn" không có nghĩa là hỏi từng đơn. Query nằm TRONG vòng lặp mới là N+1. Cùng trang đó (20 đơn, mỗi đơn 10 sản phẩm), nếu mỗi đơn hỏi sản phẩm riêng và mỗi sản phẩm hỏi thẻ riêng thì 1 + 20 + 200 = 221 query. Gom id lại hỏi một lần thì chỉ 3.

Vì sao không JOIN hết một câu? (20 đơn × 10 sản phẩm × 5 thẻ, đã chạy test)
- JOIN đơn với khách: vẫn 20 dòng (nhiều-một không nhân dòng).
- JOIN đơn với sản phẩm: 200 dòng, mỗi đơn bị lặp 10 lần.
- JOIN hết: 1000 dòng, mỗi dòng mang lại cả đơn, khách, sản phẩm; mỗi đơn và khách lặp 50 lần.
- Phân trang vỡ: JOIN đơn với sản phẩm rồi LIMIT 20 chỉ ra 2 đơn, vì LIMIT đếm dòng, không đếm đơn. Cách đúng: lấy trước 20 đơn, rồi lấy sản phẩm của chúng bằng IN.

Lưu ý: đây là quy tắc ngón tay cái, không phải luật tuyệt đối. Dữ liệu nhỏ thì một câu JOIN vẫn có thể ổn. Nhiều-một: JOIN an toàn. Một-nhiều: cân nhắc IN, nhất là khi phân trang hoặc có nhiều danh sách ngang hàng.

Hay bị hỏi vặn:
- Phát hiện N+1 thế nào? Bật log câu lệnh của ORM/database, hoặc viết test đếm số query của trang.
- Eager loading mọi thứ có tốt không? Không, kéo cả dữ liệu không dùng; chỉ tải thứ trang cần.
- ORM có identity map thì sao? Trùng user có thể không bị hỏi lại, nhưng user khác nhau vẫn thành N query.
- Thêm cache hay thêm server? Che triệu chứng, không giảm số query.

## Việc kiểm chứng

Số query (11, 101, 201; 1 và 2 cho hai cách sửa) đã chạy trong test `code/n-plus-one-demo.test.ts`; các số của bình luận ghim (3, 221, 20/200/1000 dòng, LIMIT 20 ra 2 đơn) trong `code/page-demo.test.ts` (SQLite, ORM lazy-loading tối giản tự viết). Không có số thời gian nào. Nguồn tài liệu ORM chưa đối chiếu từng câu (UNVERIFIED, xem `research.md`).
