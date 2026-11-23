<!-- scaffold:research v1 -->

# Tail latency và p99

- Level: expert
- Ngày đăng: 31/01/2027 lúc 11:30
- Video id: 31012027-tail-latency-p99-fan-out

## Câu hỏi phỏng vấn

Service của bạn có p50 là 20ms nhưng p99 là 2 giây. Vì sao tail latency tệ hơn khi fan-out nhiều backend, và bạn giảm nó thế nào?

## Vì sao nhà tuyển dụng hỏi

Kiểm tra hiểu biết về tail at scale; câu sai phổ biến là chỉ nhìn average latency và quên rằng fan-out khuếch đại p99.

## Nguồn đã xác minh

- [The Tail at Scale (Dean, Barroso)](https://research.google/pubs/the-tail-at-scale/)
- [wrk2 README: constant-throughput load generator](https://github.com/giltene/wrk2)

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
