# Content guide

## Layout

- `content/topics/<slug>/research.md` — raw research notes.
- `content/topics/<slug>/interview-kit.json` — question, follow-ups, key points, weak/strong answer, pitfalls, sources.
- `content/videos/<id>.json` — the script (meta, sources, scenes). File name must equal `meta.id`.

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

- `meta.id`, `meta.topic`: slug (`a-z`, `0-9`, dấu gạch ngang). `topic` phải có thư mục trong `content/topics/`.
- `meta.level`: `intern | junior | mid | senior`. `meta.status`: `draft | review | approved | published` (mặc định `draft`).
- `meta.aiVoiceLabel`: mặc định `true`, policy yêu cầu bật.
- `sources`: bắt buộc có (mảng, có thể rỗng chỉ khi nội dung hoàn toàn tự viết). Mỗi phần tử `{ title, url? }`.
- `scenes`: ít nhất 1 scene. Tất cả object đều `strict`: thừa field là lỗi validate.

## Scene shape

Mọi scene có chung các field:

| Field               | Kiểu / ràng buộc                                                 |
| ------------------- | ---------------------------------------------------------------- |
| `id`                | slug, duy nhất trong video                                       |
| `type`              | `hook`, `diagram`, `code`, `terminal`, `tradeoff`, `summary`     |
| `voice`             | string không rỗng, lời đọc (tiếng Việt, thuật ngữ giữ tiếng Anh) |
| `props`             | tùy `type`, xem bên dưới                                         |
| `sources`           | tùy chọn, mảng `{ title, url? }`                                 |
| `draft.durationSec` | số > 0 và <= 120, thời lượng tạm khi chưa có audio               |

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
  từng từ từ giọng thật; provider `fake` chỉ chia đều thời gian cho các từ (chỉ để xem bố cục). Caption nằm trong dải 200px cuối hộp an toàn,
  nên scene không phải tự vẽ phụ đề; sửa `voice` thì chạy lại `pnpm tts <id>` để `words` khớp.
- Mục tiêu cả video 2-4 phút, re-hook quanh giây 45 và giây 100 (xem `story-arc.md`).

## Scene reference

Mọi animation (thứ tự hiện, tốc độ gõ, morph) được suy ra từ độ dài scene, nên scene dài hơn thì reveal chậm hơn.
Các helper layout trả về cờ `fits`/`wraps`: nội dung quá nhiều sẽ bị co chữ tới mức tối thiểu, rồi tràn hoặc cuộn.
Hộp an toàn (safe zone) là **780 x 970 px** (1080 - 120 - 180, 1920 - 270 - 680). Dải 200px dưới cùng của hộp dành cho caption, nên mỗi scene tự bố cục
trong `CONTENT_BOX` = **780 x 770 px**. Các con số bên dưới là giới hạn thực tế tính từ code, tính cho `CONTENT_BOX`. Số "ước tính" là suy ra từ độ rộng ký tự trung bình, hãy kiểm bằng ảnh tĩnh (xem `qa-checklist.md`).

### hook

**Vai trò:** mở video, nêu câu hỏi phỏng vấn hoặc kết quả gây tò mò. Code: `src/scenes/HookCard/`.

| Prop       | Kiểu               | Ghi chú                                          |
| ---------- | ------------------ | ------------------------------------------------ |
| `headline` | string, không rỗng | Chữ lớn 72px (Be Vietnam Pro 800).               |
| `subline`  | string, tùy chọn   | 40px, màu muted.                                 |
| `badge`    | string, tùy chọn   | Nhãn nhỏ phía trên, ví dụ `"Junior · Database"`. |

```json
{
  "id": "hook",
  "type": "hook",
  "voice": "Bảng có mười triệu dòng, query chạy năm giây. Thêm một cái index thì sao?",
  "draft": { "durationSec": 6 },
  "props": { "badge": "Junior · Database", "headline": "Vì sao không index hết mọi cột?" }
}
```

Giới hạn: **không có bước tự co chữ và không có cờ `fits`**. Cỡ chữ cố định (72 / 40 / 36), xuống dòng tự do;
khoảng 21 ký tự mỗi dòng ở 72px (780 / (72 x 0.5)), nên giữ `headline` dưới ~80 ký tự (ước tính) và `subline` ngắn.

### diagram

**Vai trò:** "Mental Model", giải thích cơ chế bằng sơ đồ các khối nối bằng mũi tên. Code: `src/scenes/Diagram/` (layout thuần: `layout.ts`).

| Prop    | Kiểu                                      | Ghi chú                                     |
| ------- | ----------------------------------------- | ------------------------------------------- |
| `title` | string, không rỗng                        | 48px, tối đa 2 dòng (dòng thừa bị cắt).     |
| `nodes` | mảng `{ id: slug, label }`, >= 1          | `id` là slug; `label` hiển thị 40px đậm.    |
| `edges` | mảng `{ from, to, label? }` (có thể rỗng) | `from`/`to` là `id` của node; `label` 32px. |

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

Giới hạn thực tế (đo bằng `layoutDiagram`, hộp sơ đồ 780 x 634 px = `CONTENT_BOX` trừ dải tiêu đề 136px; `label` một dòng):

- **Số tầng**: **tối đa 5 tầng** khi mỗi tầng <= 3 node (6 tầng không vừa); **4 node mỗi tầng** chỉ vừa tới 4 tầng; 5 node mỗi tầng không bao giờ vừa
  (node rộng tối thiểu 140px, `MIN_NODE_WIDTH`). Khi một edge nhảy qua tầng (phải đi vòng qua đường lane) cần thêm khoảng cách giữa các tầng,
  nên hãy giữ **<= 4 tầng**. Chia nhánh cùng tầng thì không tốn thêm chiều cao.
- Chữ node tự co từ 40 xuống 28px, rồi mới tăng chiều cao tầng; node rộng tối đa 700px, cao 80-160px. `label` dài sẽ ngắt dòng và tốn chiều cao,
  nên giữ `label` ngắn (một dòng) khi có 3 node/tầng trở lên.
- `edge.label` rộng tối đa 360px; label ở đường ray bên phải bị cắt bằng dấu `…`.
- **`layoutDiagram` trả `fits`**; `pnpm qa` báo lỗi `layout.diagram-overflow` khi không vừa ở cỡ nhỏ nhất: rút ngắn label, giảm số tầng/node mỗi tầng, hoặc tách thành hai scene diagram.
- **Không được validate**: edge trỏ tới `id` không tồn tại bị bỏ qua im lặng, edge `from == to` bị bỏ, `id` node trùng thì chỉ giữ cái đầu.
  Hãy kiểm bằng mắt rằng mọi mũi tên có hiện.

### code

**Vai trò:** "Live Refactor": code trước và sau, morph từng dòng (dòng bị xóa mờ dần, dòng mới trượt vào). Code: `src/scenes/CodeDiff/`.

| Prop       | Kiểu               | Ghi chú                                                                                                                              |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `language` | string, không rỗng | Tô màu cú pháp cho `typescript`/`ts`/`tsx`/`javascript`/`js`/`jsx` và `python`/`py` (`tokenize.ts`); ngôn ngữ khác hiện chữ một màu. |
| `filename` | string, tùy chọn   | Nhãn tab; nếu thiếu thì hiện `language`.                                                                                             |
| `before`   | string, không rỗng | Code trước. Xuống dòng bằng `\n`.                                                                                                    |
| `after`    | string, không rỗng | Code sau.                                                                                                                            |
| `testPath` | string, không rỗng | Đường dẫn (tính từ gốc repo) tới test chứng minh code chạy được. `pnpm validate` kiểm file tồn tại.                                  |

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
    "testPath": "content/topics/database-index/code/lookup.test.ts"
  }
}
```

`testPath` trong ví dụ phải trỏ tới file có thật (nếu không `pnpm validate` báo lỗi).

Giới hạn (`fit.ts`, `CodeDiff.tsx`):

- Hộp code rộng 740px (780 - 2 x 20 padding), font JetBrains Mono, bề ngang ký tự = 0.6 x cỡ chữ.
- `fontSize` tự chọn từ **40px xuống 22px** sao cho dòng dài nhất (trong cả before và after) vừa một hàng: dòng <= **30 ký tự** được 40px;
  dòng ~56 ký tự được 22px. Dòng dài hơn thì khối code được **thu nhỏ (scale) tới 0.75** để thêm cột (tối đa ~74 cột ở 22px); quá nữa thì bị ngắt dòng cứng (cờ `wraps`).
- Chiều cao: vùng code cao tối đa 770 - 64 (header) - 96 (badge) - 40 (padding) = 570px. Khi số hàng x 1.5 x cỡ chữ vượt quá thì cả khối cũng bị thu nhỏ, tối thiểu 0.75.
  Cỡ chữ thực tế thấp nhất vì vậy là khoảng **16.5px** (22 x 0.75), đọc khó trên điện thoại: **hãy giữ snippet ngắn**, ví dụ mẫu dùng 5-6 dòng, mỗi dòng tối đa ~36 ký tự.
  Ở 22px không co thì vừa ~17 hàng; ở scale 0.75 vừa ~23 hàng. `pnpm qa` cảnh báo `code.line-too-long` khi dòng quá dài.
- Mọi dòng giống nhau giữa before và after được giữ nguyên và trượt vị trí (diff theo dòng, LCS): đổi nhỏ giữa hai bản cho hiệu ứng đẹp nhất.
- Màu cú pháp: xem `design-system.md`.

### terminal

**Vai trò:** chứng minh bằng số liệu thật (benchmark, `EXPLAIN`, log). Chữ được gõ ra từng ký tự, kết quả hiện sau. Code: `src/scenes/Terminal/`.

| Prop    | Kiểu                                      | Ghi chú                                              |
| ------- | ----------------------------------------- | ---------------------------------------------------- |
| `lines` | mảng `{ command, output? }`, >= 1 phần tử | `command` không rỗng; `output` nhiều dòng bằng `\n`. |

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

- Vùng chữ rộng 732px (780 trừ padding 24px mỗi bên), cao tối đa 666px (770 trừ header 56px và padding). Cỡ chữ tự chọn từ **36 xuống 24px** sao cho toàn bộ bản ghi vừa;
  ở 24px một hàng chứa ~49 ký tự (cột cuối chừa cho con trỏ) và vừa khoảng **19 hàng** (mỗi lệnh tính thêm `$ ` đầu dòng).
- Lệnh và output được **ngắt dòng theo từ** thành các hàng tường minh (`wrap.ts`), không còn break-all. Cửa sổ terminal **cao dần theo số hàng đã hiện**, tối đa bằng `CONTENT_BOX`.
- Vượt quá ~19 hàng thì giữ 24px và **tự cuộn lên**; `pnpm qa` cảnh báo `terminal.auto-scroll`. Người xem không đọc lại được phần đã cuộn nên hãy rút gọn lệnh/output.
- Tốc độ gõ tỉ lệ với độ dài lệnh: từ 22 tới tối đa 90 ký tự/giây cho tới khi mọi thứ vừa 85% độ dài scene (phần còn lại để giữ hình).
  Nếu vẫn không vừa thì tất cả bị nén đều. Lời đọc quá ngắn so với nhiều lệnh dài sẽ làm gõ rất nhanh.
- Số trong `output` được tô màu accent tự động.

### tradeoff

**Vai trò:** "Trade-offs": so sánh các lựa chọn bằng thẻ, mỗi thẻ có pros (dấu tick xanh) và cons (dấu X đỏ). Code: `src/scenes/Tradeoff/`.

| Prop      | Kiểu                                              | Ghi chú                                              |
| --------- | ------------------------------------------------- | ---------------------------------------------------- |
| `title`   | string, không rỗng                                | Tiêu đề so sánh.                                     |
| `options` | mảng, **>= 2** phần tử `{ name, pros[], cons[] }` | `pros`/`cons`: mảng string không rỗng (có thể rỗng). |

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

Giới hạn (`layout.ts`, hàm `chooseLayout`): cỡ chữ dòng giảm từng 1px từ **36 xuống 28px** (tên 36-48px, tiêu đề 40-52px); khi
chiều cao ước tính vẫn vượt 97% `CONTENT_BOX` (770px) thì `fits = false`; `pnpm qa` báo lỗi `layout.tradeoff-overflow` (và cảnh báo `layout.tradeoff-tight` khi chỉ vừa ở 28px).
Ở cỡ chữ nhỏ nhất, với dòng pros/cons ngắn (~20-30 ký tự, một hàng): **1 option** vừa ~10 dòng pros+cons, **2 option** ~4 dòng mỗi option,
**3 option** ~2 dòng, **4 option** ~1 dòng; **5 option không bao giờ vừa**. Dòng ~45 ký tự thì còn 2 dòng cho 2 option, 1 dòng cho 3 option.
Nên dùng 2 option (tối đa 3), mỗi dòng dưới ~45 ký tự.

### summary

**Vai trò:** "Takeaway + loop": các ý chính tick lần lượt, kết bằng câu dẫn ngược về hook để video lặp. Code: `src/scenes/Summary/`.

| Prop       | Kiểu                         | Ghi chú                                          |
| ---------- | ---------------------------- | ------------------------------------------------ |
| `points`   | mảng string không rỗng, >= 1 | Mỗi phần tử là một ý, có dấu tick.               |
| `loopLine` | string, tùy chọn             | Thẻ cuối nối vào hook; nên dùng trong mọi video. |

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

Giới hạn (`layout.ts`, hàm `summaryLayout`): cỡ chữ tự giảm từ **44px xuống 28px** (bước 2); không vừa `CONTENT_BOX` (780 x 770) thì `fits = false`
(`pnpm qa`: lỗi `layout.summary-overflow`, cảnh báo `layout.summary-tight` khi chỉ vừa ở 28px).
Ước tính: ý dài ~78 ký tự vừa **7 ý** (6 ý nếu có `loopLine`); ý dài ~120 ký tự vừa **5 ý** (4 ý nếu có `loopLine`). Nên giữ **3-5 ý**, mỗi ý dưới ~80 ký tự.

## Policy

- Books: ideas only, always cited in `sources`. Every video has a `sources` field.
- Images and music: only clearly licensed sources, recorded in `public/music/LICENSES.md`.
- AI voice label must be on (`meta.aiVoiceLabel`).
- Code shown in a video must run and have a test (`testPath` on `code` scenes).
- Owner reviews every video technically before publishing.

> TODO(owner): tone of voice, script style guide, topic backlog.
