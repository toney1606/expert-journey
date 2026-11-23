# Content guide

## Layout

- `content/<level>/<ddmmyyyy>/<topic>/research.md` — raw research notes (a folder with only this file is a planned stub).
- `content/<level>/<ddmmyyyy>/<topic>/interview-kit.json` — question, follow-ups, key points, weak/strong answer, pitfalls, sources.
- `content/<level>/<ddmmyyyy>/<topic>/video.json` — the script (meta, sources, scenes). `meta.id` must equal `<ddmmyyyy>-<topic>`; `meta.visibility` is `public` (default) or `private`.
- `content/<level>/<ddmmyyyy>/<topic>/code/` (tested code) and `notes/` (drafts); `content/samples/<id>/video.json` for free-form samples.

Run `pnpm validate` after every edit.

## Video JSON

```json
{
  "meta": {
    "id": "sample",
    "title": "...",
    "topic": "database-index",
    "level": "junior",
    "question": "...",
    "status": "draft",
    "aiVoiceLabel": true
  },
  "sources": [{ "title": "PostgreSQL Documentation: Indexes", "url": "https://..." }],
  "scenes": []
}
```

- `meta.id`, `meta.topic`: slug (`a-z`, `0-9`, dấu gạch ngang). `topic` phải bằng tên thư mục topic (`content/<level>/<ddmmyyyy>/<topic>/`).
- `meta.level`: `intern | fresher | junior | middle | senior | expert` (`LEVELS` trong `src/schemas/common.ts`). `meta.status`: `draft | review | approved | published` (mặc định `draft`).
- `meta.aiVoiceLabel`: mặc định `true`, policy yêu cầu bật.
- `sources`: bắt buộc có (mảng, có thể rỗng chỉ khi nội dung hoàn toàn tự viết). Mỗi phần tử `{ title, url? }`.
- `scenes`: ít nhất 1 scene. Tất cả object đều `strict`: thừa field là lỗi validate.

## Scene shape

Mọi scene có chung các field:

| Field               | Kiểu / ràng buộc                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `id`                | slug, duy nhất trong video                                                                            |
| `type`              | `hook`, `diagram`, `code`, `terminal`, `tradeoff`, `summary`, `stat`, `compare`, `callout`, `endcard` |
| `mood`              | tùy chọn: `neutral`, `problem`, `concept`, `solution`, `warning` (màu nền, xem mục Mood)              |
| `voice`             | string không rỗng, lời đọc (tiếng Việt, thuật ngữ giữ tiếng Anh)                                      |
| `props`             | tùy `type`, xem bên dưới                                                                              |
| `sources`           | tùy chọn, mảng `{ title, url? }`                                                                      |
| `draft.durationSec` | số > 0 và <= 120, thời lượng tạm khi chưa có audio                                                    |

Định nghĩa: `src/schemas/common.ts`, `src/schemas/video.ts`, và `src/scenes/<Scene>/schema.ts`.

## Thời lượng và audio

- Thời lượng scene = độ dài audio thật + **0.4s** đệm cuối (`SCENE_TAIL_SEC`, `src/lib/duration.ts`).
  Audio lấy từ `public/generated/audio/<id>/manifest.json` do `pnpm tts <id>` tạo.
- Chưa có manifest thì `draft.durationSec` được dùng; có manifest thì `draft.durationSec` bị bỏ qua cho scene có audio.
  Vì vậy hãy đặt `draft.durationSec` xấp xỉ độ dài đọc dự kiến để xem trước cho đúng.
- **Sửa bất kỳ `voice` nào thì chạy lại `pnpm tts <id>`.** Manifest cũ làm video dùng audio và độ dài của lời cũ.
  (Manifest lưu `textHash`, nên chạy lại chỉ synthesize các scene đã đổi.)
- Provider mặc định hiện là `fake` (WAV im lặng, độ dài theo số ký tự): dùng để xem nhịp, không phải giọng thật.
- **Caption từng từ**: `Video` render component `Captions` cho mỗi scene từ `words` trong manifest. `pnpm tts <id> --provider edge` lấy mốc thời gian
  từng từ từ giọng thật; provider `fake` chỉ chia đều thời gian cho các từ (chỉ để xem bố cục). Caption (52px, 2 dòng) nằm trong dải 170px cuối hộp an toàn,
  nên scene không phải tự vẽ phụ đề; sửa `voice` thì chạy lại `pnpm tts <id>` để `words` khớp.
- Mục tiêu cả video 2-4 phút, re-hook quanh giây 45 và giây 100 (xem `story-arc.md`).

## Scene reference

Mọi animation (thứ tự hiện, tốc độ gõ, morph) được suy ra từ độ dài scene, nên scene dài hơn thì reveal chậm hơn.
Các helper layout trả về cờ `fits`/`wraps`: nội dung quá nhiều sẽ bị co chữ tới mức tối thiểu, rồi tràn hoặc cuộn.
Hộp an toàn (safe zone) là **830 x 1130 px** (1080 - 90 - 160, 1920 - 230 - 560). Dải 170px dưới cùng của hộp dành cho caption, nên mỗi scene tự bố cục
trong `CONTENT_BOX` = **830 x 960 px**. Các con số bên dưới là giới hạn thực tế tính từ code, tính cho `CONTENT_BOX`. Số "ước tính" là suy ra từ độ rộng ký tự trung bình, hãy kiểm bằng ảnh tĩnh (xem `qa-checklist.md`).

### hook

**Vai trò:** mở video, nêu câu hỏi phỏng vấn hoặc kết quả gây tò mò. Code: `src/scenes/HookCard/`.

| Prop         | Kiểu               | Ghi chú                                                                             |
| ------------ | ------------------ | ----------------------------------------------------------------------------------- |
| `headline`   | string, không rỗng | Chữ lớn 88px (Be Vietnam Pro 800).                                                  |
| `subline`    | string, tùy chọn   | 48px, màu muted.                                                                    |
| `badge`      | string, tùy chọn   | Nhãn nhỏ phía trên, ví dụ `"Junior · Database"`.                                    |
| `atHeadline` | string, tùy chọn   | Cụm lời đọc làm `headline` hiện ra (xem mục Cue). `headline` hỗ trợ `{accent\|từ}`. |
| `atSubline`  | string, tùy chọn   | Cụm lời đọc làm `subline` hiện ra.                                                  |

```json
{
  "id": "hook",
  "type": "hook",
  "voice": "Bảng có mười triệu dòng, query chạy năm giây. Thêm một cái index thì sao?",
  "draft": { "durationSec": 6 },
  "props": { "badge": "Junior · Database", "headline": "Vì sao không index hết mọi cột?" }
}
```

Giới hạn: **không có bước tự co chữ và không có cờ `fits`**. Cỡ chữ cố định (headline 88 / subline 48 / badge 38), xuống dòng tự do;
khoảng 19 ký tự mỗi dòng ở 88px (830 / (88 x 0.5)), nên giữ `headline` dưới ~70 ký tự (ước tính) và `subline` ngắn.

### diagram

**Vai trò:** "Mental Model", giải thích cơ chế bằng sơ đồ các khối nối bằng mũi tên. Code: `src/scenes/Diagram/` (layout thuần: `layout.ts`).

| Prop         | Kiểu                                           | Ghi chú                                                                                                         |
| ------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `title`      | string, không rỗng                             | 54px, tối đa 2 dòng (dòng thừa bị cắt).                                                                         |
| `nodes`      | mảng `{ id: slug, label }`, >= 1               | `id` là slug; `label` hiển thị đậm 46-30px.                                                                     |
| `edges`      | mảng `{ from, to, label?, at? }` (có thể rỗng) | `from`/`to` là `id` của node; `label` 36px; `at` = cụm lời đọc lúc mũi tên được vẽ.                             |
| `nodes[].at` | string, tùy chọn                               | Cụm lời đọc lúc node hiện (mặc định: theo tầng).                                                                |
| `path`       | mảng `id` node, >= 1, tùy chọn                 | Thứ tự duyệt: một token chạy dọc các cạnh; hai node liên tiếp phải nối nhau bằng một edge (hai chiều đều được). |
| `pathAt`     | string, tùy chọn                               | Cụm lời đọc lúc bắt đầu duyệt (mặc định: sau khi reveal xong).                                                  |
| `stepLabel`  | string, tùy chọn                               | Huy hiệu bước, có `{k}` (bước hiện tại) và `{n}` (tổng). Mặc định `Bước {k}/{n}`.                               |
| `emphasis`   | `id` node, tùy chọn                            | Node có vòng sáng nhấp nháy nhẹ (node quan trọng nhất).                                                         |

```json
{
  "id": "mental-model",
  "type": "diagram",
  "voice": "Không có index, database đọc từng dòng. Có index, nó đi xuống cây B-tree vài bước.",
  "draft": { "durationSec": 8 },
  "props": {
    "title": "Full scan vs B-tree lookup",
    "nodes": [
      { "id": "query", "label": "WHERE email = ?" },
      { "id": "scan", "label": "Full table scan O(n)" }
    ],
    "edges": [{ "from": "query", "to": "scan", "label": "không có index" }]
  }
}
```

Cách layout (`layout.ts`): sơ đồ chảy từ trên xuống; tầng của node = đường dài nhất từ nguồn. Mũi tên quay ngược (tạo vòng)
được vẽ dọc đường ray bên phải (chừa 80px bề ngang). Reveal theo tầng, 80% đầu scene.

Giới hạn thực tế (đo bằng `layoutDiagram`, hộp sơ đồ 830 x 810 px = `CONTENT_BOX` trừ dải tiêu đề 150px; khi có `path` còn 830 x 746 px vì chừa 64px cho huy hiệu bước; `label` một dòng):

- **Số tầng** (chuỗi thẳng): **tối đa 6 tầng** (7 không vừa); có `path` thì **tối đa 5 tầng**. Khi một edge nhảy qua tầng (phải đi vòng qua đường lane) cần thêm khoảng cách giữa các tầng:
  chỉ vừa **5 tầng** (có `path`: 4 tầng). Hãy giữ **<= 4 tầng** cho dễ đọc. Chia nhánh cùng tầng thì không tốn thêm chiều cao.
- **Số node mỗi tầng**: tối đa **5** (vừa tới 6 tầng); 6 node mỗi tầng không bao giờ vừa (node rộng tối thiểu 140px, `MIN_NODE_WIDTH`).
- Chữ node tự co từ 46 xuống 30px, rồi mới tăng chiều cao tầng; node rộng tối đa 740px, cao 90-200px. `label` dài sẽ ngắt dòng và tốn chiều cao,
  nên giữ `label` ngắn (một dòng) khi có 3 node/tầng trở lên.
- `edge.label` rộng tối đa 360px; label ở đường ray bên phải bị cắt bằng dấu `…`.
- **`layoutDiagram` trả `fits`**; `pnpm qa` báo lỗi `layout.diagram-overflow` khi không vừa ở cỡ nhỏ nhất: rút ngắn label, giảm số tầng/node mỗi tầng, hoặc tách thành hai scene diagram.
- **Validate (`pnpm validate`)**: `id` node trùng, edge trỏ tới `id` không tồn tại, `path`/`emphasis` trỏ tới `id` không tồn tại, và bước `path` không có edge nối đều là lỗi schema.
  Edge `from == to` vẫn bị bỏ khi vẽ (chưa kiểm).

### code

**Vai trò:** "Live Refactor": code trước và sau, morph từng dòng (dòng bị xóa mờ dần, dòng mới trượt vào). Code: `src/scenes/CodeDiff/`.

| Prop       | Kiểu               | Ghi chú                                                                                                                              |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `language` | string, không rỗng | Tô màu cú pháp cho `typescript`/`ts`/`tsx`/`javascript`/`js`/`jsx` và `python`/`py` (`tokenize.ts`); ngôn ngữ khác hiện chữ một màu. |
| `filename` | string, tùy chọn   | Nhãn tab; nếu thiếu thì hiện `language`.                                                                                             |
| `before`   | string, không rỗng | Code trước. Xuống dòng bằng `\n`.                                                                                                    |
| `after`    | string, không rỗng | Code sau.                                                                                                                            |
| `testPath` | string, không rỗng | Đường dẫn (tính từ gốc repo) tới test chứng minh code chạy được. `pnpm validate` kiểm file tồn tại.                                  |
| `morphAt`  | string, tùy chọn   | Cụm lời đọc lúc `before` biến thành `after`.                                                                                         |
| `testedAt` | string, tùy chọn   | Cụm lời đọc lúc huy hiệu "tested" hiện.                                                                                              |

```json
{
  "id": "refactor",
  "type": "code",
  "voice": "Thay vòng lặp bằng tra cứu theo index.",
  "draft": { "durationSec": 14 },
  "props": {
    "language": "typescript",
    "filename": "lookup.ts",
    "before": "const hit = rows.find((r) => r.email === email);",
    "after": "const hit = byEmail.get(email);",
    "testPath": "content/junior/20122026/database-index/code/lookup.test.ts"
  }
}
```

`testPath` trong ví dụ phải trỏ tới file có thật (nếu không `pnpm validate` báo lỗi).

Giới hạn (`fit.ts`, `CodeDiff.tsx`):

- Hộp code rộng 782px (830 - 2 x 24 padding), font JetBrains Mono, bề ngang ký tự = 0.6 x cỡ chữ.
- `fontSize` tự chọn từ **44px xuống 22px** sao cho dòng dài nhất (trong cả before và after) vừa một hàng: dòng <= **29 ký tự** được 44px, <= 32 ký tự được 40px;
  dòng ~59 ký tự được 22px. Dòng dài hơn thì khối code được **thu nhỏ (scale) tới 0.75** để thêm cột (tối đa ~79 cột ở 22px); quá nữa thì bị ngắt dòng cứng (cờ `wraps`).
- Chiều cao: vùng code cao tối đa 960 - 72 (header) - 110 (badge) - 48 (padding) = 730px. Khi số hàng x 1.5 x cỡ chữ vượt quá thì cả khối cũng bị thu nhỏ, tối thiểu 0.75.
  Cỡ chữ thực tế thấp nhất vì vậy là khoảng **16.5px** (22 x 0.75), đọc khó trên điện thoại: **hãy giữ snippet ngắn**, ví dụ mẫu dùng 5-6 dòng, mỗi dòng tối đa ~36 ký tự.
  Ở 22px không co thì vừa ~22 hàng; ở scale 0.75 vừa ~29 hàng. `pnpm qa` cảnh báo `code.line-too-long` khi dòng quá dài.
- Mọi dòng giống nhau giữa before và after được giữ nguyên và trượt vị trí (diff theo dòng, LCS): đổi nhỏ giữa hai bản cho hiệu ứng đẹp nhất.
- Màu cú pháp: xem `design-system.md`.

### terminal

**Vai trò:** chứng minh bằng số liệu thật (benchmark, `EXPLAIN`, log). Chữ được gõ ra từng ký tự, kết quả hiện sau. Code: `src/scenes/Terminal/`.

| Prop    | Kiểu                                           | Ghi chú                                                                                                                    |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `lines` | mảng `{ command, output?, at? }`, >= 1 phần tử | `command` không rỗng; `output` nhiều dòng bằng `\n`; `at` = cụm lời đọc lúc bắt đầu gõ lệnh (output hiện sau khi gõ xong). |

```json
{
  "id": "proof",
  "type": "terminal",
  "voice": "Chạy EXPLAIN, thời gian giảm từ năm giây xuống năm mili giây.",
  "draft": { "durationSec": 10 },
  "props": {
    "lines": [
      {
        "command": "psql -c \"EXPLAIN ANALYZE SELECT * FROM users WHERE email='a@b.c'\"",
        "output": "Seq Scan ... 5012.3 ms"
      },
      { "command": "psql -c \"CREATE INDEX ...\"", "output": "CREATE INDEX" }
    ]
  }
}
```

Giới hạn (`timeline.ts`, `wrap.ts`, `Terminal.tsx`):

- Vùng chữ rộng 782px (830 trừ padding 24px mỗi bên), cao tối đa 856px (960 trừ header 56px và padding). Cỡ chữ tự chọn từ **40 xuống 24px** sao cho toàn bộ bản ghi vừa;
  ở 24px một hàng chứa ~53 ký tự (cột cuối chừa cho con trỏ) và vừa khoảng **24 hàng** (mỗi lệnh tính thêm `$ ` đầu dòng).
- Lệnh và output được **ngắt dòng theo từ** thành các hàng tường minh (`wrap.ts`), không còn break-all. Cửa sổ terminal **cao dần theo số hàng đã hiện**, tối đa bằng `CONTENT_BOX`.
- Vượt quá ~24 hàng thì giữ 24px và **tự cuộn lên**; `pnpm qa` cảnh báo `terminal.auto-scroll`. Người xem không đọc lại được phần đã cuộn nên hãy rút gọn lệnh/output.
- Tốc độ gõ tỉ lệ với độ dài lệnh: từ 22 tới tối đa 90 ký tự/giây cho tới khi mọi thứ vừa 85% độ dài scene (phần còn lại để giữ hình).
  Nếu vẫn không vừa thì tất cả bị nén đều. Lời đọc quá ngắn so với nhiều lệnh dài sẽ làm gõ rất nhanh.
- Số trong `output` được tô màu accent tự động.

### tradeoff

**Vai trò:** "Trade-offs": so sánh các lựa chọn bằng thẻ, mỗi thẻ có pros (dấu tick xanh) và cons (dấu X đỏ). Code: `src/scenes/Tradeoff/`.

| Prop      | Kiểu                                                           | Ghi chú                                                                                                                                                                                                                                             |
| --------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`   | string, không rỗng                                             | Tiêu đề so sánh.                                                                                                                                                                                                                                    |
| `options` | mảng, **>= 2** phần tử `{ name, pros[], cons[], at?, cueAt? }` | `pros`/`cons`: mảng string không rỗng (có thể rỗng). `at` = cụm lời đọc lúc thẻ hiện; `cueAt` = mảng cụm lời đọc cho từng dòng, xếp theo thứ tự `pros` rồi `cons` (thiếu phần tử thì dòng đó giữ thời gian tự động). `title` hỗ trợ `{accent\|từ}`. |

```json
{
  "id": "tradeoff",
  "type": "tradeoff",
  "voice": "Index làm đọc nhanh nhưng ghi chậm hơn.",
  "draft": { "durationSec": 14 },
  "props": {
    "title": "Thêm index?",
    "options": [
      { "name": "Có index", "pros": ["Đọc nhanh"], "cons": ["Ghi chậm hơn", "Tốn dung lượng"] },
      { "name": "Không index", "pros": ["Ghi nhanh"], "cons": ["Full scan khi bảng lớn"] }
    ]
  }
}
```

Giới hạn (`layout.ts`, hàm `chooseLayout`): cỡ chữ dòng giảm từng 1px từ **36 xuống 28px** (tên 36-56px, tiêu đề 40-60px); khi
chiều cao ước tính vẫn vượt 97% `CONTENT_BOX` (960px) thì `fits = false`; `pnpm qa` báo lỗi `layout.tradeoff-overflow` (và cảnh báo `layout.tradeoff-tight` khi chỉ vừa ở 28px).
Ở cỡ chữ nhỏ nhất, với dòng pros/cons ngắn (~20-30 ký tự, một hàng): **1 option** vừa ~14 dòng pros+cons, **2 option** ~6 dòng mỗi option,
**3 option** ~3 dòng, **4 option** 1 dòng, **5 option** 1 dòng (chỉ cons hoặc chỉ pros, chữ co về ~29px). Dòng ~45 ký tự thì còn 8 dòng cho 1 option, 3 dòng cho 2 option, 1 dòng cho 3 option.
Nên dùng 2 option (tối đa 3), mỗi dòng dưới ~45 ký tự.

### summary

**Vai trò:** "Takeaway + loop": các ý chính tick lần lượt, kết bằng câu dẫn ngược về hook để video lặp. Code: `src/scenes/Summary/`.

| Prop       | Kiểu                         | Ghi chú                                                                             |
| ---------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| `points`   | mảng string không rỗng, >= 1 | Mỗi phần tử là một ý, có dấu tick.                                                  |
| `loopLine` | string, tùy chọn             | Thẻ cuối nối vào hook; nên dùng trong mọi video.                                    |
| `pointsAt` | mảng string, tùy chọn        | Cụm lời đọc cho từng ý, theo chỉ số của `points` (thiếu thì giữ thời gian tự động). |
| `loopAt`   | string, tùy chọn             | Cụm lời đọc lúc `loopLine` hiện. Mỗi `points[]` hỗ trợ `{accent\|từ}`.              |

```json
{
  "id": "summary",
  "type": "summary",
  "voice": "Index đổi tốc độ ghi lấy tốc độ đọc. Vậy khi nào không nên index?",
  "draft": { "durationSec": 12 },
  "props": {
    "points": ["Index đọc nhanh, ghi chậm hơn", "Index cột có độ phân biệt cao"],
    "loopLine": "Vậy tại sao không index hết mọi cột?"
  }
}
```

Giới hạn (`layout.ts`, hàm `summaryLayout`): cỡ chữ tự giảm từ **52px xuống 28px** (bước 2); không vừa `CONTENT_BOX` (830 x 960) thì `fits = false`
(`pnpm qa`: lỗi `layout.summary-overflow`, cảnh báo `layout.summary-tight` khi chỉ vừa ở 28px).
Ước tính: ý dài ~78 ký tự vừa **8 ý** (7 ý nếu có `loopLine`); ý dài ~120 ký tự vừa **6 ý** (5 ý nếu có `loopLine`), tức 5 ý dài 120 ký tự vừa cả khi có hoặc không có `loopLine`. Nên giữ **3-5 ý**, mỗi ý dưới ~80 ký tự.

### stat

**Vai trò:** "con số gây sốc": các số lớn đếm tăng dần (counter) kèm thanh so sánh, ví dụ `10.000.000 bản ghi -> 24 bước`. Code: `src/scenes/Stat/`.

| Prop       | Kiểu                                            | Ghi chú                                                                                                                                                                                                                                                           |
| ---------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`    | string, không rỗng                              | 52px, hỗ trợ `{accent\|từ}`.                                                                                                                                                                                                                                      |
| `items`    | mảng **1-4** phần tử                            | Mỗi hàng hiện lần lượt.                                                                                                                                                                                                                                           |
| `footnote` | string, tùy chọn                                | Dòng chú thích nhỏ (30px) dưới cùng, ví dụ nguồn đo.                                                                                                                                                                                                              |
| `items[]`  | `{ label, value, unit?, caption?, tone?, at? }` | `label` không rỗng (mô tả cái được đếm); `value` số **>= 0** (counter chạy từ 0 tới số này); `unit` đơn vị đứng cạnh số; `caption` dòng nhỏ dưới số; `tone` `good\|bad\|neutral` (mặc định `neutral`: xanh lá / đỏ / xanh dương); `at` cụm lời đọc lúc hàng hiện. |

```json
{
  "id": "shock-number",
  "type": "stat",
  "voice": "Mười triệu dòng, mà index chỉ cần hai mươi bốn bước để tìm ra đúng một dòng.",
  "draft": { "durationSec": 10 },
  "props": {
    "title": "Tìm một dòng trong 10 triệu dòng",
    "items": [
      {
        "label": "Full scan",
        "value": 10000000,
        "unit": "dòng",
        "tone": "bad",
        "at": "mười triệu dòng"
      },
      {
        "label": "B-tree lookup",
        "value": 24,
        "unit": "bước",
        "tone": "good",
        "at": "hai mươi bốn bước"
      }
    ],
    "footnote": "Đo bằng script trong code/, xem research.md"
  }
}
```

Hành vi (`format.ts`, `scale.ts`, `timeline.ts`): số hiển thị kiểu Việt Nam (chấm ngăn nghìn, phẩy thập phân: `10.000.000`, `3,5`), tối đa 2 chữ số thập phân
(tự suy ra từ `value`; counter giữ nguyên độ rộng). Thanh bên dưới mỗi số: tuyến tính khi tỉ lệ lớn nhất / nhỏ nhất dương <= **30**, nếu vượt thì chuyển sang
**thang log** (`log10(1+v)`), số lớn nhất luôn đầy thanh, số > 0 nào cũng có ít nhất 7% thanh. Counter dài 20% độ dài scene, tối đa 54 frame (1,8 giây).
Không có `at` thì các hàng hiện đều từ 10% tới 55% độ dài scene.

Giới hạn thực tế (đo bằng `statLayout`, `CONTENT_BOX` 830 x 960; cỡ số tự giảm từ **156px xuống 56px**, bước 4; ví dụ dưới đây dùng `unit` ngắn, `caption` ~40 ký tự):

- **1 hàng**: số **156px** (tối đa), kể cả `label` ~50 ký tự. **2 hàng**: ~152px khi không có `caption`, ~104-124px khi có `caption` ~40 ký tự. **3 hàng**: ~88-116px khi không có `caption`
  (`label` <= ~45 ký tự), ~68-84px khi có `caption`; tối đa **3 hàng còn hiện được `caption`**.
- **4 hàng**: số ~76px, `label` <= ~40 ký tự, và mọi `caption` bị ẩn (`showCaptions = false`) để vừa; `label` ~44 ký tự trở lên với 4 hàng thì không vừa (`fits = false`).
- Độ rộng số: `value` tới 10^14 vẫn vừa (số tự co: 10.000.000 ở ~112px, 10^9 ở ~88px, 10^11 ở ~76px, 10^14 ở ~64px; thêm `unit` dài làm co thêm). Nên giữ `value` dưới 10^11.
- Nên dùng **1-2 hàng** (một con số gây sốc); 3-4 hàng chỉ khi thật sự cần so sánh.
- **Chỉ đưa số đo thật** (xem "Quy tắc chính xác" bên dưới).

### compare

**Vai trò:** phép so sánh / ví dụ đời thường: hai thẻ cạnh nhau hoặc xếp dọc ("lật từng trang" vs "mở mục lục"), có dòng kết luận. Code: `src/scenes/Compare/`.

| Prop        | Kiểu                                     | Ghi chú                                                                                                                                     |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`     | string, không rỗng                       | Tiêu đề (44-58px).                                                                                                                          |
| `left`      | `{ label, caption?, icon?, tone?, at? }` | Thẻ trái. `label` không rỗng; `icon` thuộc danh sách icon; `tone` `good\|bad\|neutral` (mặc định `neutral`); `at` cụm lời đọc lúc thẻ hiện. |
| `right`     | như `left`                               | Thẻ phải.                                                                                                                                   |
| `verdict`   | string, tùy chọn                         | Kết luận hiện cuối, hỗ trợ `{accent\|từ}`, ví dụ `"INDEX = mục lục của bảng"`.                                                              |
| `verdictAt` | string, tùy chọn                         | Cụm lời đọc lúc `verdict` hiện.                                                                                                             |

```json
{
  "id": "analogy",
  "type": "compare",
  "voice": "Không có index giống như lật từng trang sách. Có index là mở mục lục.",
  "draft": { "durationSec": 9 },
  "props": {
    "title": "Tìm một chương trong cuốn sách",
    "left": {
      "label": "Lật từng trang",
      "caption": "Full scan",
      "icon": "pages",
      "tone": "bad",
      "at": "lật từng trang"
    },
    "right": {
      "label": "Mở mục lục",
      "caption": "Index",
      "icon": "list",
      "tone": "good",
      "at": "mở mục lục"
    },
    "verdict": "{accent|INDEX} = mục lục của bảng"
  }
}
```

Bố cục (`chooseLayout`): **cạnh nhau** khi cả hai `label` <= 2 dòng và mọi thứ vừa ở cỡ label >= 36px; không thì **xếp dọc** (thẻ rộng hết hàng, icon bên trái chữ,
có dấu "vs" giữa). Cỡ label tự giảm từ 48 xuống 36px. Giới hạn đo bằng `chooseLayout` (icon 96px):

- Cạnh nhau: `label` <= ~26 ký tự (một đến hai dòng; ~24 ký tự giữ 48px, ~26 ký tự co về ~38px); `caption` ~90 ký tự vẫn vừa.
- Xếp dọc (từ `label` ~28 ký tự): `label` tới ~90 ký tự vẫn vừa khi không có gì khác; `label` ~100 ký tự + `caption` ~40 + `verdict` ~40 ký tự thì `fits = false`.
- `verdict` tới ~200 ký tự vẫn vừa ở layout cạnh nhau với label ngắn, nhưng nên giữ dưới ~60 ký tự (một câu chốt).
- Reveal: tiêu đề -> trái -> "vs" -> phải -> `verdict`, xong trong 80% scene; mỗi bước tối đa 30 frame nếu không có `at`.

### callout

**Vai trò:** một thẻ phát biểu mạnh: bác bỏ hiểu lầm (`myth`), sự thật, cảnh báo, mẹo. Chữ "đóng dấu" vào kèm rung nhẹ; kind `myth` có nét gạch xuyên qua. Code: `src/scenes/Callout/`.

| Prop            | Kiểu                                   | Ghi chú                                               |
| --------------- | -------------------------------------- | ----------------------------------------------------- |
| `kind`          | `myth` \| `fact` \| `warning` \| `tip` | Bắt buộc. Quyết định màu, kicker mặc định và mood.    |
| `kicker`        | string, tùy chọn                       | Nhãn nhỏ phía trên; mặc định theo `kind` (bảng dưới). |
| `statement`     | string, không rỗng                     | Câu lớn, hỗ trợ `{accent\|từ}`.                       |
| `explanation`   | string, tùy chọn                       | Giải thích 40px.                                      |
| `statementAt`   | string, tùy chọn                       | Cụm lời đọc lúc câu lớn đóng dấu vào.                 |
| `explanationAt` | string, tùy chọn                       | Cụm lời đọc lúc phần giải thích hiện.                 |

| `kind`    | Màu (token)      | Kicker mặc định | Mood mặc định |
| --------- | ---------------- | --------------- | ------------- |
| `myth`    | `wrong` (đỏ)     | `HIỂU LẦM`      | `problem`     |
| `fact`    | `diagram` (xanh) | `SỰ THẬT`       | `concept`     |
| `warning` | `accent` (vàng)  | `CẢNH BÁO`      | `warning`     |
| `tip`     | `correct` (lục)  | `MẸO`           | `solution`    |

```json
{
  "id": "myth",
  "type": "callout",
  "voice": "Nhiều người nghĩ thêm index là luôn nhanh hơn. Sai. Bảng nhỏ thì quét luôn còn nhanh hơn.",
  "draft": { "durationSec": 9 },
  "props": {
    "kind": "myth",
    "statement": "INDEX {accent|KHÔNG} LUÔN NHANH HƠN",
    "explanation": "Bảng vài trăm dòng thì quét toàn bảng rẻ hơn đi qua cây.",
    "statementAt": "sai",
    "explanationAt": "bảng nhỏ"
  }
}
```

Giới hạn (`calloutLayout`, tính trên chữ hiển thị đã bỏ markup): cỡ `statement` giảm từ **100px xuống 52px** (bước 2), tối đa **4 dòng**, `fits = false` khi hơn 4 dòng.
Thực tế: <= ~20 ký tự được 100px (2 dòng), ~40 ký tự vẫn 100px (4 dòng), ~54 ký tự ~74px, ~60 ký tự ~70px; **~78 ký tự vẫn vừa** (cỡ ~54px, 4 dòng); từ **~79 ký tự trở lên không vừa**.
`explanation` (40px) ~120 ký tự không làm đổi giới hạn ở câu ngắn; ~200 ký tự với câu ~30 ký tự thì `statement` còn ~80px, và ~300 ký tự thì không vừa. Nên giữ `statement` <= ~60 ký tự và `explanation` <= ~120 ký tự.

### endcard

**Vai trò:** thẻ kết video: câu chốt, lời kêu gọi (CTA), tên kênh và câu dẫn quay về hook để video lặp. Code: `src/scenes/EndCard/`.

| Prop       | Kiểu               | Ghi chú                                                                |
| ---------- | ------------------ | ---------------------------------------------------------------------- |
| `headline` | string, không rỗng | Cỡ 90px, tự giảm tới 48px.                                             |
| `subline`  | string, tùy chọn   | 40px.                                                                  |
| `cta`      | string, tùy chọn   | Lời kêu gọi, vẽ dạng nút, ví dụ `"Theo dõi để xem câu hỏi tiếp theo"`. |
| `brand`    | string, tùy chọn   | Tên kênh ở chân thẻ (34px).                                            |
| `loopLine` | string, tùy chọn   | Câu dẫn ngược về hook; nên khớp câu hỏi/câu mở của hook.               |

```json
{
  "id": "end",
  "type": "endcard",
  "voice": "Vậy tại sao không đánh index cho mọi cột? Theo dõi để biết đáp án.",
  "draft": { "durationSec": 7 },
  "props": {
    "headline": "Index đổi tốc độ ghi lấy tốc độ đọc",
    "cta": "Theo dõi để xem câu hỏi tiếp theo",
    "brand": "Expert Journey",
    "loopLine": "Vậy tại sao không index hết mọi cột?"
  }
}
```

Không có trường cue: các phần tử hiện đều nhau từ 4% tới 62% độ dài scene (thứ tự `headline`, `subline`, `cta`, `loopLine`, `brand`; phần tử thiếu thì bỏ qua).
Giới hạn (`endCardLayout`; headline 90px xuống 48px, các dòng phụ 40px): chỉ có `headline` thì <= ~100 ký tự vẫn ở 90px, ~240 ký tự co về ~60px và ~300 ký tự về 52px (vẫn vừa);
khi có đủ `subline` ~60 + `cta` ~40 + `loopLine` ~60 + `brand`, `headline` ~50 ký tự còn 68px, ~80 ký tự còn 52px, **~100 ký tự co về 48px (vẫn vừa)** và **~120 ký tự trở lên không vừa** (`fits = false`).
Nên giữ `headline` <= ~50 ký tự, mỗi dòng phụ <= ~60 ký tự.
`endcard` là scene cuối; câu cuối của `voice` nên là câu hỏi của hook để video lặp.

## Cue: hình hiện đúng lúc người đọc nói

Mọi trường cue có dạng "cụm lời đọc" (string): phần tử đó hiện ra đúng lúc người đọc nói cụm từ này trong `voice` của chính scene đó
(`findPhraseTime` ở `src/lib/spoken.ts`, `useSpokenFrame` ở `src/components/SceneTiming.tsx`).

| Scene      | Trường cue                                                                      |
| ---------- | ------------------------------------------------------------------------------- |
| `hook`     | `atHeadline`, `atSubline`                                                       |
| `diagram`  | `nodes[].at`, `edges[].at`, `pathAt` (bắt đầu duyệt `path`)                     |
| `code`     | `morphAt` (bắt đầu morph before -> after), `testedAt` (huy hiệu tested)         |
| `terminal` | `lines[].at` (bắt đầu gõ lệnh; output theo sau)                                 |
| `tradeoff` | `options[].at` (thẻ), `options[].cueAt[]` (từng dòng, thứ tự `pros` rồi `cons`) |
| `summary`  | `pointsAt[]` (theo chỉ số `points`), `loopAt`                                   |
| `stat`     | `items[].at`                                                                    |
| `compare`  | `left.at`, `right.at`, `verdictAt`                                              |
| `callout`  | `statementAt`, `explanationAt`                                                  |
| `endcard`  | không có                                                                        |

Quy tắc:

- **So khớp không phân biệt hoa thường, dấu và dấu câu** (`đ` thành `d`): `"hai mươi bốn bước"` khớp lời đọc `Hai mươi bốn bước.`. So từng từ liên tiếp; dùng cụm **2-4 từ đặc trưng**,
  đúng như viết trong `voice` (số viết bằng chữ thì cụm cũng viết bằng chữ).
- Lấy **lần xuất hiện đầu tiên** của cụm trong scene; nếu cụm lặp lại, chọn cụm dài hơn / có từ đứng trước để phân biệt.
- **Không tìm thấy cụm, không có `at`, hoặc chưa có mốc từng từ: tự động quay về timeline đều** suy ra từ độ dài scene (hành vi như cũ). Tức là `at` sai chính tả không làm hỏng video, nhưng nó mất tác dụng, nên kiểm bằng `pnpm qa` (xem `qa-checklist.md`).
  Với provider `fake`, mốc từng từ chỉ chia đều theo số ký tự nên cue chỉ xấp xỉ; cần `--provider edge` để cue khớp giọng thật.
- Các hiệu ứng được dồn cách nhau tối thiểu **3 frame** và hiệu ứng cuối bắt đầu trước hết scene ít nhất **10 frame** (`MIN_CUE_GAP`, `MIN_CUE_TAIL` trong `src/lib/cues.ts`); thứ tự hiện không bao giờ đảo ngược.
- Sửa `voice` thì chạy lại `pnpm tts <id>` để mốc từng từ khớp lời mới.

## Mood (màu nền)

Mỗi scene có `mood` tùy chọn (`MOODS` trong `src/schemas/common.ts`) quyết định màu nền động (`Backdrop`) và loại nhạc nền (`pnpm sfx`).
Không khai báo thì dùng mood mặc định theo loại scene (`defaultMoodFor` trong `src/design/mood.ts`):

| Loại scene | Mood mặc định |     | Loại scene | Mood mặc định                    |
| ---------- | ------------- | --- | ---------- | -------------------------------- |
| `hook`     | `concept`     |     | `stat`     | `concept`                        |
| `diagram`  | `concept`     |     | `compare`  | `concept`                        |
| `code`     | `solution`    |     | `callout`  | theo `kind` (bảng ở mục callout) |
| `terminal` | `neutral`     |     | `endcard`  | `solution`                       |
| `tradeoff` | `warning`     |     | `summary`  | `solution`                       |

Ý nghĩa: `problem` = đỏ, vấn đề/đau; `concept` = xanh dương/tím, giải thích khái niệm; `solution` = xanh lá, lời giải; `warning` = vàng, đánh đổi/cẩn thận; `neutral` = tím nhạt.
Hãy đặt `mood: "problem"` cho scene hook nếu video mở bằng một thất bại/nghịch lý (chuyển sang `concept` ở scene giải thích). Màu chuyển mượt qua ranh giới giữa các scene.

## Markup `{accent|từ}`

Trong các chuỗi hiển thị (xem bảng) dùng `{màu|chữ}` để tô màu: `accent` (vàng), `wrong` (đỏ), `correct` (xanh lá), `diagram` (xanh dương). Ví dụ `"Index {accent|không} luôn nhanh hơn"`.

- Hỗ trợ ở: `hook.headline`, `diagram.title`, `tradeoff.title`, `summary.points[]`, `stat.title`, `compare.verdict`, `callout.statement`. Các trường khác hiện chữ nguyên, kể cả dấu ngoặc.
- Lồng được (`{wrong|a {accent|b} c}`); tên màu lạ thì giữ màu bao ngoài; ngoặc không cân bằng thì hiện nguyên chữ (không báo lỗi). Muốn hiện ngoặc thật thì viết `\{` hoặc `\}`.
- **Không đặt markup trong `voice`**: lời đọc là chữ thuần, và các cụm `at` so khớp với `voice`.
- Chỉ nhấn 1-3 từ then chốt mỗi dòng.

## Icon và tone

- `icon` (hiện dùng ở `compare.left/right`): `book`, `pages`, `list`, `search`, `database`, `server`, `tree`, `clock`, `bolt`, `warning`, `check`, `cross`, `lock`, `cloud`, `code`, `user`
  (`ICONS` trong `src/schemas/common.ts`, vẽ bằng SVG ở `src/components/Icon/`). Giá trị lạ là lỗi validate.
- `tone`: `good` (xanh lá), `bad` (đỏ), `neutral` (xanh dương, mặc định). Dùng ở `stat.items[]` và `compare.left/right`.

## Viết kịch bản v2

Quy tắc rút ra từ các video tham chiếu (hướng dẫn cho người viết `video.json`; mục nào kiểm được bằng máy thì ghi chú trong `qa-checklist.md`).

1. **Mở bằng nghịch lý ngay giây 0.** Không chào hỏi, không "xin chào các bạn", không giới thiệu kênh. Câu đầu tiên là mâu thuẫn hoặc kết quả bất ngờ ("Thêm index mà query lại chậm đi").
2. **Hook <= 8 giây và kết bằng một câu hỏi.** Hook là scene đầu (`hook`), `voice` ngắn, câu cuối là câu hỏi người xem muốn biết đáp án.
3. **Tiêu đề 3 nhịp.** `headline` gồm ba nhịp ngắn (ví dụ "10 triệu dòng. 5 giây. Vì sao?"), dùng `{accent|...}` nhấn nhịp then chốt.
4. **Ví dụ đời thường trước, cơ chế sau.** Dùng scene `compare` (cuốn sách / mục lục) trước khi vào `diagram`.
5. **Một con số gây sốc, THẬT, có counter động.** Một scene `stat` với số đo được (xem quy tắc chính xác). Không bịa số cho kịch tính.
6. **Một thẻ bác bỏ hiểu lầm.** Một scene `callout` kind `myth`, nên đặt trước hoặc sau phần trade-off.
7. **Câu 8-20 từ, tối đa 25 từ** trong `voice`. Một ý mỗi câu, không câu lồng.
8. **Số viết bằng chữ trong `voice`, chữ số chỉ hiện trên màn hình.** `voice` viết "mười triệu dòng" (TTS đọc đúng), prop hiển thị viết `10.000.000`. Cue `at` dùng cách viết trong `voice`.
9. **Re-hook gần giây 45 và giây 100** (câu hỏi mới, số bất ngờ, hoặc `callout`); xem `story-arc.md`.
10. **End card lặp về hook.** Scene cuối là `endcard`, `loopLine` và câu cuối của `voice` dẫn thẳng về câu hỏi của hook.
11. **Mọi khẳng định phải truy được tới `research.md`** của chủ đề (và `sources` của video): ghi nguồn ở cấp scene khi scene đưa ra số liệu hoặc quy tắc.
12. **Cue mọi thứ quan trọng.** Gắn `at...` cho phần tử cần hiện đúng lúc nói (xem mục Cue), đặt `mood` hợp cảm xúc từng đoạn.

Khung gợi ý (khoảng 2-3 phút): `hook` -> `callout`/`stat` (nghịch lý, số gây sốc) -> `compare` (ví dụ đời thường) -> `diagram` (cơ chế) -> `code` hoặc `terminal` (chứng minh) -> `tradeoff` -> `callout` (myth) -> `summary` -> `endcard`.
Mỗi video luôn có `sources`; `code` luôn có `testPath`.

### Quy tắc chính xác

- **Con số chỉ lấy từ lần chạy code đo được (ghi lại lệnh và kết quả) hoặc phép tính chính xác** (ví dụ log2(10.000.000) ≈ 23,3 nên cây nhị phân cần ~24 bước). Ghi cách tính ở `research.md`/`notes/`.
- **Khẳng định chưa kiểm chứng thì không đưa vào video.** Không làm tròn cho đẹp, không "khoảng" thay cho số chưa đo, không lấy số từ trí nhớ.
- Số trong scene `stat`/`terminal` phải khớp output thật của code trong `content/.../code/` hoặc `notes/`.
- Owner vẫn duyệt kỹ thuật từng video trước khi đăng.

## Policy

- Books: ideas only, always cited in `sources`. Every video has a `sources` field.
- Images and music: only clearly licensed sources, recorded in `public/music/LICENSES.md`.
- AI voice label must be on (`meta.aiVoiceLabel`).
- Code shown in a video must run and have a test (`testPath` on `code` scenes).
- Owner reviews every video technically before publishing.

> TODO(owner): tone of voice, script style guide, topic backlog.
