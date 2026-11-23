# Research: Tại sao cần index (database-index, junior-mid)

Mọi URL bên dưới đã được fetch thành công và đọc nội dung ngày 2026-11-22. Phần diễn giải là paraphrase ngắn, không trích nguyên văn.
Claim nào chưa xác nhận được trong nguồn đã đọc thì ghi **UNVERIFIED**.

## Nguồn đã xác minh

- [PG1] PostgreSQL, Indexes - Introduction: https://www.postgresql.org/docs/current/indexes-intro.html
- [PG2] PostgreSQL, Index Types: https://www.postgresql.org/docs/current/indexes-types.html
- [PG3] PostgreSQL, Multicolumn Indexes: https://www.postgresql.org/docs/current/indexes-multicolumn.html
- [PG4] PostgreSQL, Indexes on Expressions: https://www.postgresql.org/docs/current/indexes-expressional.html
- [PG5] PostgreSQL, Partial Indexes: https://www.postgresql.org/docs/current/indexes-partial.html
- [PG6] PostgreSQL, Using EXPLAIN: https://www.postgresql.org/docs/current/using-explain.html
- [SQ1] SQLite, Query Planning: https://www.sqlite.org/queryplanner.html
- [SQ2] SQLite, EXPLAIN QUERY PLAN: https://www.sqlite.org/eqp.html
- [SQ3] SQLite, Query Optimizer Overview: https://www.sqlite.org/optoverview.html
- [MY1] MySQL 8.0, Clustered and Secondary Indexes: https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html
- [MY2] MySQL 8.0, Multiple-Column Indexes: https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html
- [UL1] Use The Index, Luke - The Search Tree (B-tree): https://use-the-index-luke.com/sql/anatomy/the-tree
- [UL2] Use The Index, Luke - Case-insensitive search (function on column): https://use-the-index-luke.com/sql/where-clause/functions/case-insensitive-search
- [UL3] Use The Index, Luke - Tuning SQL LIKE: https://use-the-index-luke.com/sql/where-clause/searching-for-ranges/like-performance-tuning
- [UL4] Use The Index, Luke - Insert/Update/Delete (DML): https://use-the-index-luke.com/sql/dml

URL thử nhưng 404 (đã bỏ): `.../where-clause/obfuscation/smart-logic` chỉ nhắc UPPER() ngẫu nhiên (không dùng); `.../searching-for-text/like-performance-and-indexes` và `.../searching-for-ranges/like-performance-and-indexes` đều 404.

## Claims của video

### 1. Không có index thì phải full table scan, chi phí O(n)

- Nguồn: [SQ1], [PG1].
- SQLite: không có index thì đọc từng dòng để tìm khớp (full table scan), thời gian tỉ lệ với N. Chấp nhận được với vài dòng, đắt với hàng triệu dòng. PostgreSQL: không có index thì phải quét cả bảng từng dòng, kém hiệu quả khi bảng lớn mà query chỉ trả ít dòng.
- Trạng thái: verified. (Chữ "O(n)" nói rõ trong [SQ1]; [PG1] chỉ nói "scan the whole table".)

### 2. Tra cứu bằng B-tree là O(log n)

- Nguồn: [SQ1], [UL1].
- [SQ1]: tra theo rowid hoặc index là binary search, tỉ lệ log N; với 10 triệu dòng khoảng triệu lần nhanh hơn (theo bảng so sánh của trang). Index lookup gồm 2 lần tìm: một lần trong index lấy rowid, một lần trong bảng lấy dòng. [UL1]: độ sâu tăng theo logarit nên rất chậm khi dữ liệu lớn lên.
- Lưu ý chính xác: B-tree không phải binary tree; mỗi node chứa nhiều entry. SQLite dùng từ "binary search" ở mức khái niệm.
- Trạng thái: verified.

### 3. Fan-out lớn nên chỉ ~3-4 tầng là phủ hàng triệu dòng

- Nguồn: [UL1].
- Trang dùng ví dụ node 4 entry (độ sâu 10 mới tới ~1 triệu), rồi nói database thật nhét hàng trăm entry mỗi node nên mỗi tầng nhân khoảng 100 lần; index vài triệu bản ghi thường sâu 4-5 tầng, hiếm khi 6.
- Trạng thái: "mỗi tầng nhân ~100" verified. Con số cụ thể **"3-4 tầng cho vài triệu dòng" là UNVERIFIED** (nguồn nói thường 4-5). Đề xuất lời thoại: "chỉ khoảng 4-5 tầng" hoặc "vài tầng", hoặc tự tính: 100^3 = 1 triệu, 100^4 = 100 triệu (phép tính, không phải trích nguồn). Số entry/node thực tế phụ thuộc kích thước key và page size (UNVERIFIED cho từng engine).

### 4. Mỗi index làm INSERT/UPDATE/DELETE chậm hơn và tốn dung lượng

- Nguồn: [PG1], [UL4], [PG4].
- [PG1]: khi có index, hệ thống phải đồng bộ với bảng nên thêm overhead cho INSERT/UPDATE/DELETE; index có thể chặn HOT update, nên index ít/không dùng thì nên drop. [UL4]: index trùng lặp dữ liệu nên mọi thay đổi phải cập nhật mọi index chứa giá trị đó; UPDATE chỉ đụng index có cột bị đổi. [PG4]: expression index tốn thêm chi phí tính biểu thức mỗi insert và update không-HOT.
- Chi phí dung lượng: index lưu bản sao dữ liệu cột ([UL4]); [MY1]: ở InnoDB secondary index chứa thêm các cột primary key nên PK dài làm mọi secondary index to hơn.
- Chi phí memory (index chiếm buffer pool/cache): **UNVERIFIED** trong các nguồn đã đọc, chỉ là suy luận hợp lý; nếu nói trong video nên diễn đạt là "tốn thêm dung lượng".
- Trạng thái: write overhead và storage verified.

### 5. Cột độ phân biệt thấp (boolean) hiếm khi có ích

- Nguồn: [PG5], [PG6].
- [PG5]: query khớp giá trị rất phổ biến (hơn vài phần trăm số dòng) thường không dùng index vì seq scan rẻ hơn; index như vậy chỉ thêm kích thước và chi phí bảo trì. Partial index (loại giá trị phổ biến) là giải pháp. [PG6]: khi khớp 70% bảng, planner chọn Seq Scan.
- Lưu ý: cột boolean vẫn có ích nếu giá trị hiếm (ví dụ is_deleted = false chiếm 0.1%), đặc biệt dưới dạng partial index. Cần nói "hiếm khi" chứ không "không bao giờ".
- Trạng thái: verified cho PostgreSQL. Con số ngưỡng cụ thể: nguồn chỉ nói "vài phần trăm", không có ngưỡng cố định. MySQL/SQLite: UNVERIFIED (chưa đọc nguồn riêng).

### 6a. WHERE lower(col) = ? không dùng được index thường

- Nguồn: [PG4], [UL2].
- Index thường lưu giá trị gốc, không phải lower(); planner chỉ dùng index khi biểu thức trong query khớp biểu thức đã index. Fix: `CREATE INDEX ... ON t (lower(col))`. [UL2]: optimizer coi hàm là hộp đen; ngoài ra có thể dùng generated/computed column rồi index cột đó (nhắc tới SQL Server và MySQL).
- Trạng thái: verified (PostgreSQL, và khái niệm chung).

### 6b. col + 0 (hoặc biểu thức số học trên cột) không dùng index

- Nguồn: [SQ3] (SQLite).
- [SQ3]: term dùng index phải có dạng "cột trần so với biểu thức"; dấu `+` đơn (unary plus, `+x=5`) cố tình vô hiệu hóa index và được tài liệu gọi là cách cuối cùng. Chú ý: unary `+` còn bỏ type affinity.
- `col + 0` kiểu cộng hai ngôi trên PostgreSQL/MySQL: **UNVERIFIED** bằng nguồn trực tiếp. Chỉ có nguyên tắc chung "biểu thức trên cột không khớp index" ([PG4], [UL2]). Trong demo nên dùng `lower(col)` hoặc `WHERE created_at + interval ...` cho engine đã xác nhận; nếu dùng `col + 0` thì ghi rõ là minh họa nguyên tắc.
- Trạng thái: SQLite verified; PostgreSQL/MySQL cho `col + 0` UNVERIFIED.

### 6c. LIKE '%x' (leading wildcard) không dùng được index

- Nguồn: [PG2], [UL3], [SQ3].
- [PG2]: B-tree dùng cho LIKE chỉ khi pattern là hằng, neo ở đầu chuỗi (`'foo%'` được, `'%bar'` không); nếu locale không phải C cần operator class đặc biệt. [UL3]: chỉ phần ký tự trước wildcard đầu tiên dùng để duyệt cây; leading wildcard thường dẫn tới full scan; PostgreSQL với bind parameter giả định có leading wildcard nên không dùng index. [SQ3]: LIKE chỉ được chuyển thành range khi vế phải không bắt đầu bằng wildcard (và vài điều kiện về collation/affinity).
- Gợi ý: full-text hoặc trigram index khi thật sự cần tìm giữa chuỗi ([UL3] nhắc full-text; trigram/pg_trgm chỉ được nhắc qua kết quả search, chưa đọc trang gốc: UNVERIFIED).
- MySQL cho LIKE '%x': **UNVERIFIED** (chưa fetch trang MySQL về LIKE).
- Trạng thái: PostgreSQL và SQLite verified.

### 7. Composite index theo quy tắc leftmost-prefix

- Nguồn: [MY2], [SQ1], [SQ3], [PG3].
- [MY2]: index (last_name, first_name) phục vụ lookup theo last_name, hoặc cả hai; không phục vụ query chỉ có first_name. [SQ1]: index (fruit, state) nhanh cho fruit hoặc fruit+state, không giúp query chỉ có state; nên bỏ index là tiền tố của index khác. [SQ3]: cột bên trái dùng =, IN, IS; không được bỏ qua cột; cột sau cột có bất đẳng thức không dùng được. [PG3]: ràng buộc bằng trên các cột đầu và một bất đẳng thức quyết định phần index bị quét; điều kiện cột sau vẫn được kiểm trong index nhưng không thu hẹp vùng quét.
- Khác biệt: PostgreSQL docs (bản current) mô tả **skip scan** (tối ưu khi cột đầu ít giá trị khác nhau); SQLite có skip-scan chỉ sau ANALYZE và khi cột đầu nhiều bản sao. MySQL 8.0 trang đã đọc không nhắc skip scan. Vì vậy câu "không bỏ qua cột đầu" đúng là quy tắc mặc định, có ngoại lệ phụ thuộc engine và phiên bản.
- Trạng thái: verified. (Phiên bản PostgreSQL có skip scan: UNVERIFIED, trang "current" hiện mô tả nó nhưng chưa đọc release notes.)

### 8. Planner có thể bỏ qua index trên bảng nhỏ (và khi nhiều dòng khớp)

- Nguồn: [PG6], [PG1].
- [PG6]: bảng chỉ chiếm một disk page thì gần như luôn ra sequential scan dù có index vì phải đọc 1 page rồi; kết quả trên bảng đồ chơi không suy ra được cho bảng lớn; khi khớp 70% bảng cũng chọn Seq Scan; `enable_seqscan = off` chỉ là gợi ý, không cấm. [PG1]: planner chỉ dùng index khi cho rằng rẻ hơn seq scan; chạy ANALYZE để thống kê được cập nhật.
- Hệ quả cho demo: bảng seed phải đủ lớn (ví dụ hàng trăm nghìn dòng trở lên) để EXPLAIN thấy khác biệt.
- SQLite/MySQL cho bảng nhỏ: UNVERIFIED.
- Trạng thái: PostgreSQL verified.

### 9. EXPLAIN là bằng chứng

- Nguồn: [PG6], [SQ2].
- PostgreSQL: Seq Scan (đọc cả bảng, lọc bằng Filter), Index Scan (Index Cond), Bitmap Heap Scan (khi nhiều dòng khớp). `EXPLAIN ANALYZE` thực sự chạy query, nên với INSERT/UPDATE/DELETE phải bọc trong transaction rồi ROLLBACK. SQLite: `SCAN t` = duyệt mọi dòng, `SEARCH t USING INDEX i (a=?)` = dùng index thu hẹp, `COVERING INDEX` = đủ cột không cần đọc bảng.
- Trạng thái: verified. Cảnh báo cho video: nếu demo SQLite thì dùng nhãn SCAN/SEARCH, nếu PostgreSQL thì Seq Scan/Index Scan; không trộn.

## Khác biệt giữa engine đáng nhắc

- Đọc plan: PostgreSQL `Seq Scan` / `Index Scan` / `Bitmap Heap Scan`; SQLite `SCAN` / `SEARCH`.
- InnoDB (MySQL): bảng lưu theo clustered index (thường là primary key); secondary index chứa cột PK nên tra bằng secondary là đi 2 lần (secondary rồi clustered) và PK dài làm index phình ([MY1]). SQLite cũng 2 lần tìm (index rồi bảng) ([SQ1]). PostgreSQL là heap nên khác mô hình này (UNVERIFIED trong nguồn đã đọc ở điểm "heap", chỉ suy ra từ nhắc HOT tuple ở [PG1]).
- Partial index và expression index: PostgreSQL có hỗ trợ trực tiếp ([PG4], [PG5]); MySQL dùng generated column rồi index ([UL2]).
- LIKE prefix trên PostgreSQL phụ thuộc locale/operator class ([PG2]); SQLite có điều kiện collation riêng ([SQ3]).
- Skip scan: có ở PostgreSQL (docs current) và SQLite (có điều kiện); ngoại lệ của leftmost-prefix.

## Niềm tin sai thường gặp (interviewer hay nghe)

1. "Index mọi cột cho chắc" - sai: mỗi index tốn write và dung lượng, index không dùng nên drop ([PG1], [UL4]).
2. "Có index là query chắc chắn nhanh hơn" - sai: planner có thể chọn seq scan khi bảng nhỏ hoặc khớp nhiều dòng ([PG6], [PG5]).
3. "Tôi có index trên cột này rồi mà vẫn chậm" - thường do hàm bọc cột, LIKE '%x', hoặc sai thứ tự cột composite ([PG4], [UL3], [MY2]).
4. "Index (a,b) dùng được cho WHERE b = ?" - sai theo mặc định (leftmost-prefix), trừ skip scan ([MY2], [SQ3], [PG3]).
5. "Thấy index trong plan là ổn" - dùng index khác với dùng hiệu quả (nhận định của Use The Index, Luke trong phần hỏi đáp, chưa fetch trang gốc nên không dùng làm nguồn chính: UNVERIFIED).
6. "Index chỉ giúp WHERE" - B-tree còn trả dữ liệu theo thứ tự (ORDER BY) và giúp JOIN; [PG2] nói B-tree trả về dòng đã sắp xếp. Phần JOIN: UNVERIFIED trong nguồn đã đọc.
7. "Thêm index không ảnh hưởng ghi" - sai ([PG1]).

## Gợi ý cho script

- Nói con số: [SQ1] nêu mức cải thiện ~triệu lần với 10 triệu dòng (lý thuyết); không hứa con số này cho demo thực. Dùng số đo thật từ demo.
- Câu 3-4 tầng: xem mục 3, sửa thành "vài tầng" hoặc "4-5 tầng".
- Mỗi pitfall trong video nên khớp một claim mục 6a, 6c, 7 (đã verified cho PostgreSQL).
