# Script v2: Tại sao cần index?

Narration per scene (numbers as spoken words; digits only on screen). Mood in brackets.

## hook (hook, mood problem)

Một index, query nhanh hơn mười nghìn lần. Vậy sao không index hết mọi cột?

## stakes-scan (terminal, mood problem)

Bảng users có một triệu dòng. Mình tìm một email. Không có index, kế hoạch ghi là SCAN: đọc từng dòng. Kết quả: hơn hai mươi hai mili giây. Một người thì không sao. Một nghìn người cùng lúc thì sao?

## analogy (compare, mood concept)

Hãy nghĩ tới một cuốn sách dày. Không có mục lục, bạn phải lật từng trang. Có mục lục, bạn mở thẳng tới đúng chương. Index chính là mục lục của bảng.

## numbers (stat, mood problem)

Không index, một triệu dòng nghĩa là tối đa một triệu phép so sánh. Tìm nhị phân trên dữ liệu đã sắp xếp chỉ cần khoảng hai mươi bước. Một tỷ dòng? Vẫn chỉ khoảng ba mươi bước.

## btree (diagram, mood concept)

Index thường là cây B-tree: nút gốc, nút giữa, nút lá, rồi dòng dữ liệu. Giờ đi tìm một email. Mỗi bước xuống, bạn bỏ cả nhánh lớn. Một triệu dòng cũng chỉ vài tầng.

## myth (callout, mood warning)

Có index chưa chắc nhanh hơn. Bảng nhỏ, hoặc điều kiện khớp quá nhiều dòng, thì quét cả bảng có thể rẻ hơn. Database tự cân nhắc. Đừng đoán, hãy kiểm chứng bằng EXPLAIN.

## live-refactor (code, mood solution)

Trong code cũng vậy. Thay vì lặp cả mảng, mình dựng sẵn một bảng tra theo email. Dựng một lần, tìm rẻ mãi.

## explain-proof (terminal, mood solution)

Giờ thử thật. Tạo index mất khoảng bốn trăm mili giây. Kế hoạch đổi từ SCAN thành SEARCH USING INDEX. Còn khoảng hai phần nghìn mili giây: trong bài thử của mình, nhanh hơn mười nghìn lần.

## rehook-all-columns (hook, mood problem)

Vậy index mọi cột cho chắc? Nghe an toàn, nhưng đó là câu trả lời yếu. Cái giá của nó là gì?

## trade-offs (tradeoff, mood warning)

Index đổi tốc độ ghi lấy tốc độ đọc. Đọc nhanh hơn. Nhưng ghi chậm hơn: trong bài thử của mình, SQLite, ba index làm INSERT chậm khoảng hai lần. Và tốn chỗ: index theo email nặng gần bằng nửa cái bảng. Còn không index? Ghi nhanh, nhẹ, nhưng mỗi lần đọc là quét cả bảng.

## pitfall-lower (terminal, mood warning)

Còn một cái bẫy. Email có index, nhưng bọc trong hàm lower thì kế hoạch vẫn là SCAN. Index lưu email gốc, không lưu kết quả của hàm. Hãy tạo index trên chính biểu thức đó. Thế là SEARCH quay lại.

## takeaway (summary, mood solution)

Tóm lại. Không index, database quét cả bảng. Có index, nó đi xuống cây vài tầng. Đổi lại, ghi chậm hơn và tốn dung lượng. Hãy index theo query thật, rồi kiểm chứng bằng EXPLAIN.

## endcard (endcard, mood concept)

Đừng đoán, hãy đo. Và giờ bạn trả lời được chưa: một index nhanh hơn mười nghìn lần, vậy sao không index hết mọi cột?

## Per-scene notes

- hook: Opens on the paradox at t=0, no greeting; ends on a question. Headline = statement + twist, subline = question (3 beats).
- stakes-scan: Pain: SCAN plan and 22,7 ms (measurements.json primary).
- analogy: Book without/with table of contents; cards appear on "lật từng trang" / "mở thẳng".
- numbers: Counters tick up on the spoken numbers; footnote says log2 is a calculation, not a measurement.
- btree: Token travels root -> internal -> leaf -> row on "Giờ đi tìm"; row node pulses. Depth said as "vài tầng" only.
- myth: Only verified claim: planner may choose a full scan for small tables / many matching rows (PG docs); otherwise "kiểm chứng bằng EXPLAIN".
- live-refactor: Code scene with tested lookup.ts.
- explain-proof: Measured SQLite ratio, qualified with "trong bài thử của mình".
- rehook-all-columns: Second hook (re-hook ~100 s), ends on a question.
- trade-offs: Cards and rows appear on cues.
- pitfall-lower: lower(email) bypasses plain index; fix with expression index.
- takeaway: Points tick on cues.
- endcard: Loops into the hook (loopLine repeats the paradox).

## Accuracy table

| Claim                                                                   | Source                                                                                                     |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1.000.000 rows, scan 22,7 ms, plan SCAN                                 | code/measurements.json primary.scanMs, plan.noIndex                                                        |
| index lookup ~0,002 ms, faster "hơn mười nghìn lần"                     | measurements.json primary.speedup 12332, safeSpeedupFloor 10000 (1.000.000-row measurement only, SQLite)   |
| CREATE INDEX "khoảng bốn trăm mili giây"                                | primary.createIndexMs 398.4                                                                                |
| 3 indexes slow INSERT "khoảng hai lần"                                  | insert.threeIndexesRatio 2.12, insertRatioFloor.three 2.1                                                  |
| email index "gần bằng nửa cái bảng", ~45%                               | indexToTableSizeRatio 0.45                                                                                 |
| scan needs at most 1.000.000 comparisons                                | exact: worst case n (research.md claim 1, SQ1)                                                             |
| ~20 steps for 1.000.000, ~30 for 1.000.000.000                          | log2(10^6)=19,93; log2(10^9)=29,9 (exact maths; research claim 2)                                          |
| B-tree "vài tầng"                                                       | research claim 3 (4-5 levels found, "3-4" UNVERIFIED, so not used)                                         |
| Planner can pick a full scan for small tables / many matching rows      | research claim 8 (PG6, PG1), verified for PostgreSQL; wording kept generic, plus "kiểm chứng bằng EXPLAIN" |
| lower(email) not served by plain index; expression index fixes it       | research claim 6a (PG4, UL2); demo in terminal-scenes.json                                                 |
| Writes must update every index                                          | research claim 4 (PG1, UL4)                                                                                |
| Not used: JOIN benefit, memory cost, MySQL/SQLite small-table behaviour | UNVERIFIED in research.md                                                                                  |
