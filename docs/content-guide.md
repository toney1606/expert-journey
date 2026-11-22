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
- Mục tiêu cả video 2-4 phút, re-hook quanh giây 45 và giây 100 (xem `story-arc.md`).

## Scene reference

Mọi animation (thứ tự hiện, tốc độ gõ, morph) được suy ra từ độ dài scene, nên scene dài hơn thì reveal chậm hơn.
Các helper layout trả về cờ `fits`/`wraps`: nội dung quá nhiều sẽ bị co chữ tới mức tối thiểu, rồi tràn hoặc cuộn.
Hộp nội dung (safe zone) là **850 x 1350 px** (1080 - 60 - 170, 1920 - 150 - 420). Các con số bên dưới là giới hạn thực tế
tính từ code, tính cho hộp này. Số "ước tính" là suy ra từ độ rộng ký tự trung bình, hãy kiểm bằng ảnh tĩnh (xem `qa-checklist.md`).

### hook

**Vai trò:** mở video, nêu câu hỏi phỏng vấn hoặc kết quả gây tò mò. Code: `src/scenes/HookCard/`.

| Prop       | Kiểu               | Ghi chú                                          |
| ---------- | ------------------ | ------------------------------------------------ |
| `headline` | string, không rỗng | Chữ lớn 84px (Be Vietnam Pro 800).               |
| `subline`  | string, tùy chọn   | 44px, màu muted.                                 |
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

Giới hạn: **không có bước tự co chữ và không có cờ `fits`**. Cỡ chữ cố định (84 / 44 / 36), xuống dòng tự do;
khoảng 17 ký tự mỗi dòng ở 84px, nên giữ `headline` dưới ~80 ký tự (ước tính, khoảng 5 dòng) và `subline` ngắn.

### diagram

**Vai trò:** "Mental Model", giải thích cơ chế bằng sơ đồ các khối nối bằng mũi tên. Code: `src/scenes/Diagram/` (layout thuần: `layout.ts`).

| Prop    | Kiểu                                      | Ghi chú                                     |
| ------- | ----------------------------------------- | ------------------------------------------- |
| `title` | string, không rỗng                        | 64px, tối đa 2 dòng (dòng thừa bị cắt).     |
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

Giới hạn thực tế:

- **Số tầng**: vùng sơ đồ cao 1350 - 210 (tiêu đề) = 1140px; mỗi node cao tối thiểu 120px và khoảng cách tầng tối thiểu 90px nên
  **tối đa 5 tầng** (6 tầng tràn). Chia nhánh cùng tầng thì không tốn thêm chiều cao.
- **Số node mỗi tầng**: bề ngang 850px chia đều (khoảng cách cột 28px). 2 node mỗi tầng còn ~400px/node, 3 node còn ~260px
  (khoảng 10 ký tự mỗi dòng ở 40px), nên với 3 node/tầng hãy giữ `label` dưới ~20 ký tự (ước tính). Tổng thực tế: dưới ~10 node.
- Node rộng tối đa 700px, cao 120-160px; `label` dài sẽ ngắt dòng (`overflowWrap: anywhere`) và có thể tràn khung node.
- `edge.label` rộng tối đa 360px; label ở đường ray bên phải bị cắt bằng dấu `…`.
- **Không được validate**: edge trỏ tới `id` không tồn tại bị bỏ qua im lặng, edge `from == to` bị bỏ, `id` node trùng thì chỉ giữ cái đầu.
  Hãy kiểm bằng mắt rằng mọi mũi tên có hiện.
- Hiện chưa có cờ `fits` cho Diagram.

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

Giới hạn (`fit.ts`, `layout.ts`, `CodeDiff.tsx`):

- Hộp code rộng 794px (850 - 2 x 28 padding), font JetBrains Mono, bề ngang ký tự = 0.6 x cỡ chữ.
- Cỡ chữ tự chọn từ **40px xuống 22px** sao cho dòng dài nhất (trong cả before và after) vừa một hàng:
  dòng <= **33 ký tự** được 40px; dòng 60 ký tự được 22px; **dài hơn 60 ký tự thì bị ngắt dòng cứng** (cờ `wraps`) và nhìn xấu, hãy giữ code <= 60 cột.
- Chiều cao: vùng code cao tối đa 1350 - 84 (header) - 130 (badge) - 56 = 1080px. Khi số hàng x 1.5 x cỡ chữ vượt quá thì toàn khối bị
  thu nhỏ (`scale`), không cuộn. Ở 22px khoảng **32 hàng** vừa không co; hơn nữa chữ nhỏ dần, nên giữ <= ~25 dòng mỗi bên.
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

Giới hạn (`timeline.ts`, `Terminal.tsx`):

- Vùng chữ rộng 786px, cao 1214px (hộp 850 x 1350 trừ header 72px và padding 32px). Cỡ chữ tự chọn từ **40 xuống 28px** sao cho toàn bộ bản ghi vừa;
  ở 28px một hàng chứa ~46 ký tự, và vừa khoảng **29 hàng** (mỗi lệnh tính thêm `$ ` đầu dòng).
- Vượt quá 29 hàng thì giữ 28px và **tự cuộn lên** để hàng mới nhất luôn thấy. Chạy được, nhưng người xem không đọc lại được phần đã cuộn.
  Thực tế: 3 lệnh x 2 dòng output vẫn được 40px; 8 lệnh x 3 dòng output đã xuống 28px.
- Tốc độ gõ tỉ lệ với độ dài lệnh: từ 22 tới tối đa 90 ký tự/giây cho tới khi mọi thứ vừa 85% độ dài scene (phần còn lại để giữ hình).
  Nếu vẫn không vừa thì tất cả bị nén đều. Lời đọc quá ngắn so với nhiều lệnh dài sẽ làm gõ rất nhanh.
- Số trong `output` được tô màu accent tự động. Dòng dài tự ngắt (break-all).

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

Giới hạn (`layout.ts`, hàm `chooseLayout`): cỡ chữ dòng giảm dần từ **40px xuống 28px** (tên 40-56px, tiêu đề 44-60px); khi
chiều cao ước tính vẫn vượt 97% hộp 1350px thì `fits = false` (nội dung tràn xuống vùng ngoài safe zone).
Số ước tính (dòng ~40-50 ký tự mỗi hàng): **2 option** vừa tới ~10 dòng pros+cons mỗi option khi dòng ngắn (~30 ký tự), ~5 dòng khi dòng ~50 ký tự;
**3 option** vừa ~5 dòng mỗi option (dòng ~30 ký tự) hoặc ~3 dòng (dòng ~50 ký tự). Nên giữ mỗi dòng pros/cons dưới ~45 ký tự
và tổng số dòng pros+cons của toàn scene khoảng 8 trở xuống để chữ đủ lớn khi xem trên điện thoại.

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

Giới hạn (`layout.ts`, hàm `summaryLayout`): cỡ chữ tự giảm từ **56px xuống 30px** (bước 2); không vừa hộp 850 x 1350 thì `fits = false`.
Ước tính: với `loopLine`, vừa khoảng **9 ý** dài ~60 ký tự hoặc **7 ý** dài ~90 ký tự (không `loopLine` thêm ~1-2 ý).
Chữ chỉ còn ~34-40px khi có từ 5 ý trở lên, nên nên giữ **3-5 ý**, mỗi ý dưới ~70 ký tự.

## Policy

- Books: ideas only, always cited in `sources`. Every video has a `sources` field.
- Images and music: only clearly licensed sources, recorded in `public/music/LICENSES.md`.
- AI voice label must be on (`meta.aiVoiceLabel`).
- Code shown in a video must run and have a test (`testPath` on `code` scenes).
- Owner reviews every video technically before publishing.

> TODO(owner): tone of voice, script style guide, topic backlog.
