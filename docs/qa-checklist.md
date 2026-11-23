# QA checklist

Trước khi video vào hàng đợi publish. Cột "Tự động" cho biết `pnpm validate` và `pnpm qa` kiểm được gì; mục "Thủ công" là việc của owner.

| Mục                                                                                    | Tự động (`pnpm validate`)                                                                                                                                                     | Thủ công                                                                        |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| JSON đúng schema (field thừa/thiếu, kiểu, scene id trùng, `sources` có mặt)            | Có                                                                                                                                                                            |                                                                                 |
| `content/<level>/<ddmmyyyy>/<topic>/video.json` có `meta.id` = `<ddmmyyyy>-<topic>`    | Có                                                                                                                                                                            |                                                                                 |
| `meta.topic`/`meta.level` khớp thư mục, kèm `research.md`; `interview-kit.json` hợp lệ | Có                                                                                                                                                                            |                                                                                 |
| `testPath` của scene `code` trỏ tới file tồn tại                                       | Có (chỉ kiểm file tồn tại)                                                                                                                                                    |                                                                                 |
| Code trong video chạy được và test pass                                                | Không                                                                                                                                                                         | Chạy `pnpm test` (test nằm ở `testPath`)                                        |
| Nội dung đúng về kỹ thuật                                                              | Không                                                                                                                                                                         | Owner review                                                                    |
| Mọi thứ nằm trong safe zone                                                            | Không                                                                                                                                                                         | Mở `debugSafeZone`, xem ảnh tĩnh từng scene                                     |
| Nội dung không tràn (cờ `fits` / `wraps` của layout, xem `content-guide.md`)           | `pnpm qa`: `layout.<loại>-overflow` cho tradeoff, summary, diagram, stat, compare, callout, endcard (lỗi); `*-tight`, `terminal.auto-scroll`, `code.line-too-long` (cảnh báo) | Xem ảnh tĩnh scene dày nhất của mỗi loại                                        |
| Dấu tiếng Việt không bị cắt                                                            | Không                                                                                                                                                                         | Xem ảnh tĩnh, `FontTest`                                                        |
| Sources đầy đủ; ảnh/nhạc ghi trong `public/music/LICENSES.md`                          | Chỉ kiểm `sources` có mặt                                                                                                                                                     | Kiểm nội dung nguồn và giấy phép                                                |
| AI voice label bật (`meta.aiVoiceLabel`)                                               | `pnpm qa`: `policy.ai-voice-label`                                                                                                                                            | Kiểm giá trị                                                                    |
| Re-hook gần 0:45 và 1:40; câu cuối dẫn về hook                                         | `rehook.missing`, `script.loop` (cảnh báo)                                                                                                                                    | Nghe/xem lại                                                                    |
| Thời lượng 2-4 phút, audio khớp lời mới nhất                                           | `duration.out-of-range`, `narration.*` (thiếu/cũ audio)                                                                                                                       | Chạy lại `pnpm tts <id>` sau khi sửa `voice`, kiểm tổng thời lượng trong Studio |

## Kiểm tra tự động của `pnpm qa <id>`

`pnpm qa` (exit 1 khi có lỗi) chạy các check trong `pipeline/qa/checks.ts`; `pnpm produce` chạy nó trước khi render. Mã `error` chặn, `warn` chỉ cảnh báo.

| Nhóm       | Mã                                                                                                                                                               | Mức                  | Kiểm gì                                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Thời lượng | `duration.out-of-range`                                                                                                                                          | warn (draft) / error | tổng 120-240s                                                                                                                            |
| Policy     | `policy.ai-voice-label`, `policy.no-sources`                                                                                                                     |                      | nhãn giọng AI bật; có `sources`                                                                                                          |
| Cấu trúc   | `structure.first-not-hook` (error), `structure.last-not-summary`, `structure.voice-too-long`                                                                     | warn                 | scene đầu là `hook`; cuối là `summary`/`endcard`; `voice` <= 400 ký tự                                                                   |
| Re-hook    | `rehook.missing`                                                                                                                                                 | warn                 | có ranh giới scene trong ±15s quanh giây 45 (video >= 90s) và 100 (video >= 130s)                                                        |
| Lời đọc    | `narration.exceeds-draft`, `narration.no-manifest-entry`, `narration.audio-missing`, `narration.stale-manifest-scene`                                            | warn/error           | lời quá dài so với draft; thiếu audio/manifest (chạy `pnpm tts`)                                                                         |
| Code       | `code.test-missing`, `code.line-too-long`                                                                                                                        |                      | `testPath` tồn tại; dòng code quá dài                                                                                                    |
| Layout     | `layout.<tradeoff\|summary\|diagram\|stat\|compare\|callout\|endcard>-overflow` (error), `layout.tradeoff-tight`, `layout.summary-tight`, `terminal.auto-scroll` |                      | nội dung không vừa hộp                                                                                                                   |
| Kịch bản   | `script.cue-missing` (**error**)                                                                                                                                 | error                | mọi cụm `at`/`atHeadline`/`pointsAt`/`cueAt`... có trong `voice` của chính scene (so khớp không dấu)                                     |
| Kịch bản   | `script.hook-opening`, `script.hook-length`, `script.hook-question`                                                                                              | warn                 | hook không mở bằng lời chào ("xin chào", "hôm nay"...), `voice` <= 35 từ, có dấu `?`                                                     |
| Kịch bản   | `script.sentence-long`, `script.digits-in-voice`, `script.scene-long`                                                                                            | warn                 | câu > 25 từ; chữ số/ký hiệu (`%`, `≠`, `O(...)`) trong `voice`; scene > 25s                                                              |
| Kịch bản   | `script.mood-monotony`, `script.loop`, `script.markup`                                                                                                           | warn                 | >= 4 scene liên tiếp cùng mood; scene cuối không lặp >= 3 từ khóa của hook (hoặc `endcard.loopLine` >= 2); markup `{...}` không cân bằng |

Chưa tự động: đúng kỹ thuật, số liệu khớp code đo, hook <= 8 giây (chỉ kiểm số từ), tính thật của con số, chất lượng giọng, âm lượng thực (`pnpm render` chuẩn hóa -14 LUFS nhưng không có check riêng).

## Bước duyệt thủ công: contact sheet và ảnh tĩnh

`pnpm sheet <id>` (contact sheet toàn video) hiện **chưa có** trong `pipeline/cli.ts`; khi chưa có, xem từng scene bằng công thức ảnh tĩnh bên dưới.
Với mỗi scene: viền safe zone, chữ không tràn, dấu tiếng Việt, mood/màu nền hợp cảm xúc, phần tử hiện đúng lúc nói (cue), con số trên màn hình khớp `voice` và kết quả code đo.

## Cách xem nhanh một scene (ảnh tĩnh)

Dựng file props tạm với **một** scene, rồi render một frame. Kiểm chứng chạy được ở Remotion 4.0.545.

1. Lấy `content/samples/sample/video.json`, giữ nguyên `meta`/`sources`, đổi `meta.id` thành `scene-test-x` (id này không có manifest audio,
   nên độ dài lấy từ `draft.durationSec`), chỉ để lại **một** scene muốn xem, và bọc thành props của composition:

   ```json
   {
     "video": {
       "meta": { "id": "scene-test-x", "...": "..." },
       "sources": [],
       "scenes": [{ "...": "một scene" }]
     },
     "debugSafeZone": true
   }
   ```

   Đặt file ngoài repo (ví dụ thư mục scratch), đừng commit.

2. Render một frame (frame tính từ đầu scene, 30fps; nên chọn frame ~70-90% độ dài scene để thấy reveal đã xong):

   ```bash
   pnpm exec remotion still src/index.ts Video out/scene.png --props=/path/to/props.json --frame=60
   ```

3. Mở ảnh, kiểm: viền safe zone, chữ không tràn/chồng, dấu tiếng Việt, màu. Đổi `--frame` để xem các pha của animation.
   Lần chạy đầu bundle khá lâu (vài phút).

Dùng `debugSafeZone: true` để thấy viền safe zone; đặt `false` để xem hình cuối như khi render.
