# Script draft: Tại sao cần index (database-index, junior-mid)

Voice: edge vi-VN-HoaiMyNeural -10%, ~2.0 words/s. Placeholders `{{...}}` are replaced by measured numbers (spoken form, e.g. 'một trăm hai mươi') before TTS. Placeholders count as 1 word each here; the spoken number may add 1-3 words. Cumulative seconds exclude the +0.4 s tail per scene (add 0.4 x scenes, 4 s total, for real boundaries).

| #   | id                 | type     | voice                                                                                                                                                                                                                                                                                                          | words | est. sec | cum. sec at END |
| --- | ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------- | --------------- |
| 1   | hook               | hook     | Khi phỏng vấn, mình hay hỏi: thêm index, query nhanh hơn {{LOOKUP_SPEEDUP}} lần. Vậy sao không index hết mọi cột? Câu trả lời cho thấy bạn hiểu index, hay chỉ thuộc lòng.                                                                                                                                     | 32    | 16.0     | 16.0            |
| 2   | stakes-scan        | terminal | Bảng users có mười triệu dòng. Tìm một email mất {{SCAN_MS}} mili giây. Kế hoạch ghi là SCAN: full table scan, đọc từng dòng. Trường hợp xấu, đọc hết mười triệu dòng.                                                                                                                                         | 32    | 16.0     | 32.0            |
| 3   | mental-model-scan  | diagram  | Full scan là O của n: bảng lớn gấp mười lần thì chậm khoảng gấp mười lần. Tìm bằng index là O của log n: số bước tăng rất chậm.                                                                                                                                                                                | 30    | 15.0     | 47.0            |
| 4   | mental-model-btree | diagram  | Index thường là cây B-tree: nút gốc, nút giữa, rồi nút lá trỏ tới dòng thật. Mỗi nút chứa rất nhiều khóa, nên với hàng triệu dòng, thường chỉ ba đến bốn tầng. Vài bước là tới đúng dòng.                                                                                                                      | 39    | 19.5     | 66.5            |
| 5   | live-refactor      | code     | Trong code, thay vì lặp qua cả mảng để tìm email, mình tra trong cấu trúc dựng sẵn theo email. Ý tưởng giống index: dựng một lần, tìm rẻ mãi.                                                                                                                                                                  | 30    | 15.0     | 81.5            |
| 6   | explain-proof      | terminal | Giờ CREATE INDEX, rồi chạy lại EXPLAIN. SCAN đổi thành SEARCH USING INDEX. Còn {{INDEX_MS}} mili giây, nhanh hơn {{LOOKUP_SPEEDUP}} lần.                                                                                                                                                                       | 21    | 10.5     | 92.0            |
| 7   | rehook-all-columns | hook     | Nhiều bạn trả lời phỏng vấn: index mọi cột cho nhanh. Vậy index hết mọi cột được không? Đây là câu trả lời yếu. Xem cái giá nhé.                                                                                                                                                                               | 28    | 14.0     | 106.0           |
| 8   | trade-offs         | tradeoff | Index không miễn phí: đọc nhanh hơn, nhưng ghi chậm hơn. Mỗi lần INSERT, UPDATE hay DELETE, database phải cập nhật cả mọi index. Với ba index, INSERT chậm hơn {{INSERT_SLOWDOWN_3_INDEXES}} lần, lại tốn thêm đĩa. Câu trả lời mạnh: index theo cột trong WHERE, JOIN, ORDER BY, rồi kiểm chứng bằng EXPLAIN. | 53    | 26.5     | 132.5           |
| 9   | pitfall-lower      | terminal | Còn một cái bẫy. Email đã có index, nhưng query viết WHERE lower của email bằng dấu hỏi, và kế hoạch vẫn là SCAN. Index lưu email gốc, không phải kết quả của hàm. Phải tạo index trên chính biểu thức đó.                                                                                                     | 42    | 21.0     | 153.5           |
| 10  | takeaway           | summary  | Tóm lại: index đổi O của n thành O của log n, đổi lại ghi chậm hơn và tốn đĩa. Index theo query thật, kiểm chứng bằng EXPLAIN. Vậy giờ bạn trả lời được chưa: sao thêm index query nhanh hơn, mà không index hết mọi cột?                                                                                      | 47    | 23.5     | 177.0           |

**Totals:** 354 words, about 177 s (2.95 min); with +0.4 s tails about 181 s. Within the 330-450 word budget.

## Weak vs strong answer

- Weak: in `rehook-all-columns`, 'index mọi cột cho nhanh' (matches interview-kit weakAnswer).
- Strong: in `trade-offs`, 'index theo cột trong WHERE, JOIN, ORDER BY, rồi kiểm chứng bằng EXPLAIN' (matches strongAnswer).
- Interviewer voice: hook ('Khi phỏng vấn, mình hay hỏi') and rehook ('nhiều bạn trả lời phỏng vấn thế này').

## Re-hook check

- 45 s: end of `mental-model-scan` at 47.0 s est. (about 48 s with tails); the end of `stakes-scan` (32 s) is also within 15 s. Pass.
- 100 s: end of `explain-proof` / start of `rehook-all-columns` at 92.0 s est. (about 95 s with tails); end of the re-hook scene at 106.0 s. Both within 15 s of 100 s. Pass.
- Spoken placeholder numbers add about 10 words (about +5 s) in total, mostly after scene 2; boundaries stay inside the windows (re-check after TTS with `pnpm qa`).
- Loop: first line asks 'vì sao thêm một cái index, query nhanh hơn ... lần, vậy sao không index hết mọi cột'; last line repeats the same question, answered.

## Numbers to fill

| Placeholder                   | Meaning                                                             | Source                                                                       |
| ----------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| {{LOOKUP_SPEEDUP}}            | speed-up ratio of indexed lookup vs scan (spoken as integer, 'lần') | measured by benchmark agent; must equal the terminal output in explain-proof |
| {{SCAN_MS}}                   | lookup time with full scan, ms (stakes-scan terminal)               | measured                                                                     |
| {{INDEX_MS}}                  | lookup time with index, ms (explain-proof terminal)                 | measured                                                                     |
| {{INSERT_SLOWDOWN_3_INDEXES}} | INSERT slowdown ratio with 3 indexes vs none                        | measured; shown on the tradeoff card                                         |

Rule: scan time / index time must be consistent with {{LOOKUP_SPEEDUP}} (round the same way as the screen). Hook also uses {{LOOKUP_SPEEDUP}}: if the ratio is a messy number, round and say 'khoảng'.

## Pronunciation risks (TTS)

- 'SQL' not used; avoided. Commands read as English words: SCAN, CREATE INDEX, EXPLAIN, SEARCH USING INDEX, INSERT, UPDATE, DELETE, WHERE, JOIN, ORDER BY. The vi voice may spell or anglicize them unevenly: listen to each.
- 'B-tree' may be read 'bê tri' or spelled 'B trờ-ri'; if bad, write 'bi tree'.
- 'O của n', 'O của log n': 'log n' may be read 'lốc n'; listen, fallback 'lô-ga-rít n'.
- 'lower của email bằng dấu hỏi' is a spoken paraphrase of lower(email) = ?; verify it is clear. Fallback: 'WHERE hàm lower áp lên cột email'.
- 'query', 'index', 'database', 'full table scan', 'full scan': English words in Vietnamese voice, check stress.
- Placeholders must be replaced by spoken Vietnamese numbers (no digits, no '×', no '%').
- Technical hedges: B-tree depth 'thường chỉ ba đến bốn tầng'; 'trường hợp xấu' for scan reading all rows; code scene analogy is a lookup structure, not literally a B-tree. The pitfall explanation (expression index) is accurate for PostgreSQL and SQLite; confirm the terminal agent's engine matches the EXPLAIN wording (SCAN / SEARCH USING INDEX is SQLite wording).
