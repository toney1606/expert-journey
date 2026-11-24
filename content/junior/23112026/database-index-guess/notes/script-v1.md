# database-index-guess — script v1 (rút gọn, ~2:35)

Chủ đề: Database đoán sai (statistics, composite/partial index). Level junior. Chờ owner duyệt trước khi tts/render.

## 1 HookScene
Một câu query chạy mười hai mili giây suốt sáu tháng. Sáng nay, một phẩy hai giây. Chậm gấp trăm lần. Không ai đổi code. Không ai đổi index. Dữ liệu gần như y nguyên. Vậy chuyện gì xảy ra? Database không biết trước kết quả. Nó đoán. Và hôm nay, nó đoán sai.

## 2 ThreeReadsScene
Trước hết: database rất lười đọc đĩa, vì đĩa là thứ chậm nhất. Nó không đọc từng dòng, mà đọc từng khối, gọi là page. Index chính là trang mục lục. Mỗi trang chỉ tới ba trăm trang con. Ba tầng như vậy phủ hai mươi bảy triệu dòng. Tìm một người trong mười triệu người, chỉ cần khoảng ba lần đọc. Ba. Không phải mười triệu.

## 3 CostScene
Nhưng không phải lúc nào nó cũng dùng index. Với mỗi query, nó tính giá hai đường: đi qua index, hay đọc cả bảng. Nhảy tới page ngẫu nhiên đắt hơn đọc liền, mặc định PostgreSQL là gấp bốn lần. Nhân với số dòng nó nghĩ là khớp, ra giá. Đường nào rẻ hơn thì đi. Để ý chữ nghĩ: nó không đếm thật, nó dựa vào thống kê. Cả câu chuyện sáng nay nằm ở chữ nghĩ đó.

## 4 SetupScene
Bảng orders, mười triệu dòng. Lấy mười đơn chờ xử lý mới nhất, có index trên ngày tạo. Đơn chờ chiếm năm phần trăm. Database nhẩm: hai mươi đơn có một đơn chờ, đi lùi từ đơn mới nhất, khoảng hai trăm đơn là đủ mười. Rẻ quá, chọn luôn. Và suốt sáu tháng, nó đúng.

## 5 TwistScene
Rồi công ty bật tự động duyệt. Đơn mới được xử lý ngay, đơn còn chờ chỉ còn là đơn cũ, nằm sâu phía sau. Nhưng chúng vẫn chiếm năm phần trăm, nên thống kê không đổi. Database vẫn tin: hai trăm đơn là đủ. Thực tế, nó phải bỏ qua hàng triệu đơn đã xử lý, từng đơn một, mới chạm tới đơn chờ đầu tiên. Cùng query. Cùng index. Thứ sai là một giả định: đơn chờ nằm rải đều. Giờ chúng dồn về một phía.

## 6 FixScene
Chạy EXPLAIN ANALYZE, bạn sẽ thấy nó đi ngược index từ mới về cũ. Mỗi đơn nó hỏi: đơn chờ không? Không, bỏ. Không, bỏ. Con số nằm ở dòng Rows Removed by Filter. Thấy nó lên hàng triệu, là bạn bắt được thủ phạm.
Phản xạ của nhiều người là chạy ANALYZE. Chẳng đổi được gì, vì thống kê đâu có sai: nó biết năm phần trăm là đơn chờ, chỉ không biết đơn chờ nằm ở đâu.
Nên đừng bắt nó đoán nữa. Tạo index trên trạng thái, rồi đến ngày tạo. Đơn chờ nằm sát nhau, đã sắp theo ngày. Nó nhảy thẳng tới, đọc mười đơn rồi dừng. Từ hàng triệu dòng, còn mười.

## 7 IndexCardsScene
Index vừa rồi là composite. Còn vài loại nữa, mỗi loại giải một bài toán. B+Tree, mặc định: tìm đúng một giá trị, một khoảng, hoặc cần thứ tự. Unique: cấm trùng, như email. Composite: nhiều cột, thứ tự cột quyết định query nào được giúp. Covering: chứa đủ cột query cần, khỏi quay về bảng. Partial: chỉ giữ dòng thỏa điều kiện, như năm phần trăm đơn chờ, nhỏ hơn hai chục lần, ghi cũng nhẹ hơn. Cuối cùng là full-text, để tìm từ trong văn bản, chỗ B+Tree bó tay.

## 8 CliffhangerScene
Giờ đến thử thách. Index nhanh vì giá trị đã sắp xếp, nhưng sắp xếp không có nghĩa là nó biết thứ hạng. Danh sách đơn hàng, trang một chỉ vài mili giây. Kéo tới trang mười nghìn thì chậm hẳn, dù có index ngày tạo. Vì sao, và sửa thế nào? Câu này hay gặp khi phỏng vấn. Trả lời ở bình luận, mình ghim đáp án đúng.
