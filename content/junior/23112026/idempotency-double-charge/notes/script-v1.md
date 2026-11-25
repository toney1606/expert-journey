# idempotency-double-charge — script v3 (~1:45)

Chủ đề: Bấm thanh toán hai lần, bị trừ hai lần. Level junior. Cảnh 1, 2, 5 đã đổi lời (owner duyệt); audio ba cảnh này chờ tạo lại.

## 1 HeroCard (vấn đề)
Tiền khách bị trừ hai lần. Khách chỉ bấm một lần. Server báo thành công. Database báo thành công. Không một dòng log đỏ. Code chạy đúng hết, vậy lỗi ở đâu?

## 2 HeroCard (diễn biến)
Yêu cầu tới server, server trừ tiền thành công. Nhưng mạng chậm, câu trả lời không về kịp. Ứng dụng chờ mãi, hết thời gian, và nghĩ: chắc hỏng rồi, thử lại. Yêu cầu thứ hai tới server. Nó không biết đây là lần thử lại, thấy một yêu cầu thanh toán mới, và trừ tiền lần nữa. Nhớ điều này: hết thời gian chờ không có nghĩa là thất bại. Ứng dụng chỉ biết nó không nhận được câu trả lời, không biết server đã làm hay chưa.

## 3 HeroCard (cách sửa)
Cách sửa: mỗi lần bấm thanh toán, ứng dụng tạo một mã riêng, gọi là idempotency key, và gửi kèm theo yêu cầu. Thử lại mười lần, vẫn cùng một mã. Server lưu lại mã này. Gặp mã đã xử lý, nó không trừ tiền nữa, mà trả lại đúng kết quả của lần đầu. Nhiều cổng thanh toán hỗ trợ sẵn cơ chế này.

## 4 HeroCard (chốt chặn)
Nhưng chỉ kiểm tra trong code thì chưa đủ. Chốt chặn cuối cùng phải nằm ở database: đặt ràng buộc duy nhất trên cột mã này. Dù code có sai, database cũng không cho phép có hai dòng cùng một mã.

## 5 HeroCard (thử thách)
Giờ đến câu hỏi phỏng vấn. Nhiều người kiểm tra trước: chạy SELECT xem mã đã có chưa, chưa có thì INSERT. Nghe rất hợp lý. Nhưng nếu lần thử lại đến khi lần đầu còn đang xử lý, khách vẫn bị trừ tiền hai lần. Vì sao? Trả lời ở bình luận, mình sẽ ghim đáp án đúng.
