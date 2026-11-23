<!-- scaffold:research v1 -->

# B-tree và LSM-tree

- Level: expert
- Ngày đăng: 05/02/2027 lúc 11:30
- Video id: 05022027-btree-vs-lsm-write-amplification

## Câu hỏi phỏng vấn

So sánh B-tree với LSM-tree cho workload ghi nhiều. Write, read, space amplification đánh đổi ra sao và compaction ảnh hưởng thế nào?

## Vì sao nhà tuyển dụng hỏi

Kiểm tra hiểu storage engine; câu sai phổ biến là nói LSM luôn nhanh hơn mà bỏ qua compaction và read amplification.

## Nguồn đã xác minh

- [The Log-Structured Merge-Tree (O'Neil et al.)](https://www.cs.umb.edu/~poneil/lsmtree.pdf)
- [RocksDB wiki: Compaction](https://github.com/facebook/rocksdb/wiki/Compaction)
- [PostgreSQL docs: B-Tree Indexes](https://www.postgresql.org/docs/current/btree.html)

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
