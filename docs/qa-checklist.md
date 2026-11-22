# QA checklist

Trước khi video vào hàng đợi publish. Cột "Tự động" cho biết `pnpm validate` hiện kiểm được gì; mục "Thủ công" là việc của owner.

| Mục                                                                                                | Tự động (`pnpm validate`)            | Thủ công                                                                        |
| -------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| JSON đúng schema (field thừa/thiếu, kiểu, scene id trùng, `sources` có mặt)                        | Có                                   |                                                                                 |
| `content/videos/<id>.json` có `meta.id` khớp tên file                                              | Có                                   |                                                                                 |
| `meta.topic` có thư mục `content/topics/<slug>/`, kèm `research.md` và `interview-kit.json` hợp lệ | Có                                   |                                                                                 |
| `testPath` của scene `code` trỏ tới file tồn tại                                                   | Có (chỉ kiểm file tồn tại)           |                                                                                 |
| Code trong video chạy được và test pass                                                            | Không                                | Chạy `pnpm test` (test nằm ở `testPath`)                                        |
| Nội dung đúng về kỹ thuật                                                                          | Không                                | Owner review                                                                    |
| Mọi thứ nằm trong safe zone                                                                        | Không                                | Mở `debugSafeZone`, xem ảnh tĩnh từng scene                                     |
| Nội dung không tràn (cờ `fits` / `wraps` của layout, xem `content-guide.md`)                       | Không                                | Xem ảnh tĩnh scene dày nhất của mỗi loại                                        |
| Dấu tiếng Việt không bị cắt                                                                        | Không                                | Xem ảnh tĩnh, `FontTest`                                                        |
| Sources đầy đủ; ảnh/nhạc ghi trong `public/music/LICENSES.md`                                      | Chỉ kiểm `sources` có mặt            | Kiểm nội dung nguồn và giấy phép                                                |
| AI voice label bật (`meta.aiVoiceLabel`)                                                           | Không (mặc định `true`, không bị ép) | Kiểm giá trị                                                                    |
| Re-hook gần 0:45 và 1:40; câu cuối dẫn về hook                                                     | Không                                | Nghe/xem lại                                                                    |
| Thời lượng 2-4 phút, audio khớp lời mới nhất                                                       | Không                                | Chạy lại `pnpm tts <id>` sau khi sửa `voice`, kiểm tổng thời lượng trong Studio |

> TODO(owner): QA tự động (mức âm lượng, khớp caption, giới hạn thời lượng). Một phần đang được xây trong `pipeline/qa/`.

## Cách xem nhanh một scene (ảnh tĩnh)

Dựng file props tạm với **một** scene, rồi render một frame. Kiểm chứng chạy được ở Remotion 4.0.545.

1. Lấy `content/videos/sample.json`, giữ nguyên `meta`/`sources`, đổi `meta.id` thành `scene-test-x` (id này không có manifest audio,
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
