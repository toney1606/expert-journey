<!-- scaffold:research v1 -->

# Virtual memory và OOM

- Level: expert
- Ngày đăng: 02/02/2027 lúc 19:30
- Video id: 02022027-virtual-memory-demand-paging-oom-killer

## Câu hỏi phỏng vấn

Process dùng 8GB virtual nhưng chỉ 1GB RSS, rồi container bị OOM killed. Virtual memory, demand paging và overcommit giải thích chuyện này thế nào?

## Vì sao nhà tuyển dụng hỏi

Phân biệt virtual, resident, cache và cgroup limit khi debug production; câu sai phổ biến là đọc VSZ như mức dùng RAM.

## Nguồn đã xác minh

- [Linux kernel docs: Concepts overview (memory management)](https://docs.kernel.org/admin-guide/mm/concepts.html)
- [Linux kernel docs: Overcommit Accounting](https://docs.kernel.org/mm/overcommit-accounting.html)

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
