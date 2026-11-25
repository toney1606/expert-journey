# timezone-utc — script v1 (~250 từ, 5 cảnh)

Chủ đề: Bug mà database không có lỗi. Level junior. Ảnh bìa: `notes/cover.png` (đã chốt). Chưa tts, chưa render; chờ owner duyệt script + ảnh.

## Caption TikTok

Khách đặt 9 giờ sáng, email nhắc ghi 14 giờ, khách đến muộn 5 tiếng ⏰ Database không hề sai.
Câu dễ gặp khi phỏng vấn Backend: lịch hẹn lặp lại mỗi tuần lúc 9 giờ sáng, lưu bằng UTC thì lệch ra sao khi đổi giờ mùa hè?
Đáp án ở bình luận ghim 👇
#phongvandev #backend #database #phỏngvấnit #timezone #utc

## Bình luận ghim

Đáp án: database không sai, và lưu UTC cũng không sai. Chỗ sai là coi "9 giờ sáng mỗi thứ Hai" như một thời điểm cố định.

1) Vì sao lệch: lịch lặp lưu 08:00 UTC (9 giờ sáng giờ mùa đông Berlin, UTC+1). Sau Chủ nhật 28/03/2027, Berlin sang UTC+2 nên 08:00 UTC hiện thành 10:00. Người dùng thấy cuộc họp muộn một tiếng. Chiều ngược lại, lịch tạo vào mùa hè (07:00 UTC) sẽ sớm một tiếng khi đồng hồ lùi ngày 31/10/2027.

2) Lưu đúng: giờ địa phương (09:00) + tên múi giờ IANA (Europe/Berlin) + quy tắc lặp (RRULE: FREQ=WEEKLY;BYDAY=MO). Rồi tính ra UTC cho từng lần xảy ra bằng tzdata. Kết quả: 22/03/2027 là 08:00 UTC, 29/03 và 05/04 là 07:00 UTC, giờ Berlin luôn là 9 giờ.

3) Hay bị hỏi vặn:
- UTC sai à? Không. UTC đúng cho thời điểm đã xảy ra hoặc đã chốt (created_at, thanh toán, log).
- timestamptz có lưu múi giờ không? Không. Nó đổi về UTC khi lưu và đổi lại theo TimeZone của phiên khi đọc, nên vẫn cần cột tzid riêng.
- MySQL: TIMESTAMP đổi theo time_zone của phiên và có giới hạn năm 2038. DATETIME giữ nguyên con số, hợp để lưu giờ địa phương kèm cột tzid.
- Sao không lưu offset +02:00 hay viết tắt CEST? Offset không chứa luật đổi giờ, viết tắt thì mơ hồ. Dùng tên IANA.
- Luật múi giờ có đổi thật không? Có. Chính phủ vẫn đổi hoặc bỏ giờ mùa hè, nên cuộc hẹn tương lai nên lưu giờ địa phương và tính UTC muộn nhất có thể.
- Giờ không tồn tại và giờ lặp: 02:30 ngày 28/03/2027 ở Berlin không tồn tại, 02:30 ngày 31/10/2027 xảy ra hai lần. Cần quy ước rõ, thường theo iCalendar.
- Việt Nam không có giờ mùa hè (UTC+7), nên lỗi này hay bị bỏ sót.

## Việc kiểm chứng

V1–V3 đã chạy (Python, owner). V4–V7 chưa chạy (owner bỏ qua). V8 đã bỏ.
