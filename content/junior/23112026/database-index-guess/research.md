# Research: Database đoán sai (database-index-guess, junior)

Nguồn bên dưới được liệt kê từ tài liệu chính thức nhưng **UNVERIFIED trong phiên này**: chưa fetch lại để đối chiếu từng câu. Owner nên soát trước khi publish.

- PostgreSQL Documentation: Statistics Used by the Planner: https://www.postgresql.org/docs/current/planner-stats.html
- PostgreSQL Documentation: Planner Cost Constants (random_page_cost): https://www.postgresql.org/docs/current/runtime-config-query.html
- PostgreSQL Documentation: Using EXPLAIN: https://www.postgresql.org/docs/current/using-explain.html
- PostgreSQL Documentation: Multicolumn Indexes: https://www.postgresql.org/docs/current/indexes-multicolumn.html
- PostgreSQL Documentation: Partial Indexes: https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL Documentation: Index Types: https://www.postgresql.org/docs/current/indexes-types.html
- Use The Index, Luke: The Search Tree: https://use-the-index-luke.com/sql/anatomy/the-tree

## Claims

- Planner ước lượng số dòng khớp từ thống kê (planner-stats) — UNVERIFIED fetch.
- `random_page_cost` mặc định 4.0, `seq_page_cost` 1.0 (runtime-config-query) — UNVERIFIED fetch.
- Composite/partial index, EXPLAIN "Rows Removed by Filter" (indexes-multicolumn, indexes-partial, using-explain) — UNVERIFIED fetch.
- Số đo: SQLite, 10.000.000 dòng, đo thật bằng `code/measure.ts` (xem `code/measurements.json`). Đây là SQLite, không phải Postgres; cơ chế "bỏ qua dòng không khớp khi quét ngược index" giống nhau.
- Số trong hook (12 ms, 1,2 giây) là minh họa theo lời đọc đã chốt, không phải số đo.
