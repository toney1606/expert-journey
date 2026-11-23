<!-- scaffold:research v1 -->

# epoll và C10K

- Level: expert
- Ngày đăng: 02/02/2027 lúc 11:30
- Video id: 02022027-epoll-vs-select-c10k

## Câu hỏi phỏng vấn

Vì sao epoll scale tốt hơn select/poll, và level-triggered khác edge-triggered thế nào? Bug nào hay gặp với edge-triggered?

## Vì sao nhà tuyển dụng hỏi

Kiểm tra mô hình I/O của OS dưới Node.js, nginx, Netty; câu sai phổ biến là nghĩ epoll làm I/O nhanh hơn thay vì giảm chi phí theo số fd.

## Nguồn đã xác minh

- [epoll(7) Linux man page](https://man7.org/linux/man-pages/man7/epoll.7.html)
- [The C10K problem (Dan Kegel)](http://www.kegel.com/c10k.html)

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
