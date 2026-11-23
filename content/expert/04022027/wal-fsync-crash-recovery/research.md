<!-- scaffold:research v1 -->

# WAL, fsync và crash recovery

- Level: expert
- Ngày đăng: 04/02/2027 lúc 19:30
- Video id: 04022027-wal-fsync-crash-recovery

## Câu hỏi phỏng vấn

Database đảm bảo durability thế nào khi mất điện giữa chừng? Write-ahead log và fsync làm gì, và fsync fail thì sao?

## Vì sao nhà tuyển dụng hỏi

Kiểm tra hiểu durability tới tầng OS; câu sai phổ biến là tin write() thành công nghĩa là dữ liệu đã an toàn.

## Nguồn đã xác minh

- [PostgreSQL docs: Write-Ahead Logging (WAL)](https://www.postgresql.org/docs/current/wal-intro.html)
- [PostgreSQL wiki: Fsync Errors (fsyncgate)](https://wiki.postgresql.org/wiki/Fsync_Errors)

## Câu trả lời mạnh / yếu

TODO

## Các khẳng định cần kiểm chứng

| Khẳng định | Nguồn | VERIFIED/UNVERIFIED |
| ---------- | ----- | ------------------- |
| TODO       | TODO  | UNVERIFIED          |

## Hiểu lầm phổ biến

TODO

## Khác biệt giữa các engine/ngôn ngữ

TODO

## Ý tưởng cảnh (hook, ẩn dụ, số liệu thật cần đo, thuật ngữ)

TODO
