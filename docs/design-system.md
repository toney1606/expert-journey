# Design system

Nguồn sự thật trong code: `src/design/` (`tokens.ts`, `springs.ts`, `fonts.ts`, `useFonts.ts`). Không hardcode màu, khoảng cách hay spring trong scene.

## Canvas

- 1080x1920 @ 30fps (`VIDEO` trong `tokens.ts`).

## Safe zone

`safeZone` trong `tokens.ts`: top **150**, bottom **420**, right **170**, left **60** px (giá trị khởi đầu, chưa chỉnh theo UI thật của
TikTok/Reels). Hộp nội dung còn lại = **850 x 1350 px**, đặt tại (60, 150). `SafeZoneFrame` bọc mọi scene trong hộp này
(`safeBox` trong `src/lib/safe-zone.ts`), nên scene chỉ cần fill `100%` và không tự canh lề.
Bật viền kiểm tra bằng prop `debugSafeZone` (mặc định bật trong composition mẫu): viền đỏ đứt nét và vùng ngoài được phủ hồng.

## Màu (Catppuccin Mocha)

| Token (`colors`) | Hex       | Dùng cho                       |
| ---------------- | --------- | ------------------------------ |
| `bg`             | `#1e1e2e` | nền video                      |
| `card`           | `#313244` | thẻ, khối code, node           |
| `text`           | `#cdd6f4` | chữ chính                      |
| `textMuted`      | `#a6adc8` | chữ phụ, nhãn cạnh             |
| `accent`         | `#f9e2af` | nhấn, badge, số trong terminal |
| `correct`        | `#a6e3a1` | đúng, pros, dòng thêm, "after" |
| `wrong`          | `#f38ba8` | sai, cons, dòng xóa, "before"  |
| `diagram`        | `#89b4fa` | khối và mũi tên của sơ đồ      |

### Màu cú pháp code

`src/scenes/CodeDiff/syntax.ts` (`tokenColors`) dùng các token trên cộng 4 màu Catppuccin Mocha chỉ dùng cho code:

| Loại token            | Màu                |
| --------------------- | ------------------ |
| `keyword`             | mauve `#cba6f7`    |
| `string`              | `colors.correct`   |
| `comment`             | overlay0 `#6c7086` |
| `number`              | peach `#fab387`    |
| `punctuation`         | overlay2 `#9399b2` |
| `identifier`, `plain` | `colors.text`      |
| `type`                | `colors.accent`    |

Nếu cần thêm màu cú pháp mới, lấy từ bảng Catppuccin Mocha và thêm vào `syntax.ts`, không rải hex vào component.

## Khoảng cách

`spacing`: xs 8, sm 16, md 32, lg 48, xl 72 (px).

## Font

- Be Vietnam Pro (tiêu đề, nội dung; 400/700/800) và JetBrains Mono (code; 400/700), file OFL cục bộ trong `public/fonts/`.
  `fontFamily.title` và `fontFamily.code`; nạp bằng `useFonts()` (chặn render tới khi font sẵn sàng, thiếu font thì render lỗi).
- **Quy tắc line-height:** `lineHeight.title = 1.3`, `lineHeight.body = 1.45`. Không đặt line-height < 1.3 cho chữ tiếng Việt,
  nếu không dấu chồng (ví dụ `ệ`, `ữ`) bị cắt. Composition `FontTest` dùng để kiểm tra.
- Ngoại lệ có chủ đích: code dùng 1.5 (CodeDiff) và 1.45 (Terminal), chữ đơn dòng trong khung có `overflow: hidden` cần thêm padding đáy.
- Cỡ chữ không cố định theo bảng: mỗi scene có helper tự chọn cỡ chữ lớn nhất vừa hộp (xem `content-guide.md`). Các cỡ nền: hook headline 84,
  diagram title 64 / node 40 / edge 32, code 22-40, terminal 28-40, tradeoff 28-60, summary 30-56.

## Motion

- Chỉ dùng `useCurrentFrame()`, `spring()`, `interpolate()`. Không CSS `transition` hay `animation` (lint chặn ở mức best effort).
- Presets trong `src/design/springs.ts`:
  - `snappy` `{ damping: 22, stiffness: 180, mass: 1 }`: mặc định cho mọi hiệu ứng vào cảnh, không nảy.
  - `soft` `{ damping: 200 }`: nền và chuyển động lớn.
  - `bouncy` `{ damping: 12, stiffness: 140 }`: nảy vui, dùng hạn chế.
- Mẫu "rise": opacity 0 -> 1 kèm `translateY` 32-48px -> 0 bằng `snappy`.
- **Timeline reveal luôn suy ra từ `durationInFrames`** (tức độ dài audio), không hardcode số frame. Mỗi scene dồn phần reveal vào khoảng 60-85% đầu
  (summary: item cuối ở 62%, tradeoff/diagram: xong ở 80%) và giữ hình phần còn lại để người xem đọc kịp.
- Khoảng giữ khung hình tối thiểu cho mỗi ý: chưa quyết định.

> TODO(owner): typography scale chính thức, component catalog, motion guidelines (thời gian giữ tối thiểu, re-hook pattern).
