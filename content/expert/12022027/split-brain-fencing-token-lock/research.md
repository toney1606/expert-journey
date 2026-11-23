<!-- scaffold:research v1 -->

# Split brain và fencing token

- Level: expert
- Ngày đăng: 12/02/2027 lúc 11:30
- Video id: 12022027-split-brain-fencing-token-lock

## Câu hỏi phỏng vấn

Hai node cùng nghĩ mình là leader (split brain), hoặc lock hết hạn giữa chừng khi process bị GC pause. Fencing token giải quyết thế nào?

## Vì sao nhà tuyển dụng hỏi

Kiểm tra thiết kế an toàn khi lock lease hết hạn; câu sai phổ biến là tin Redis lock đủ cho correctness.

## Nguồn đã xác minh

- [How to do distributed locking (Kleppmann)](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [The Chubby lock service for loosely-coupled distributed systems](https://research.google/pubs/the-chubby-lock-service-for-loosely-coupled-distributed-systems/)

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
