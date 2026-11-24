# Design system

Nguồn sự thật trong code: `src/design/` (`tokens.ts`, `springs.ts`, `fonts.ts`, `useFonts.ts`). Không hardcode màu, khoảng cách hay spring trong scene.

## Canvas

- 1080x1920 @ 30fps (`VIDEO` trong `tokens.ts`).

## Safe zone

`safeZone` trong `tokens.ts`: top **200**, bottom **420**, left **90**, right **160** px. Hộp an toàn (`SAFE_BOX`) = **830 x 1300 px**, đặt tại (90, 200).
`SafeZoneFrame` bọc mọi scene trong hộp này (`safeBox` trong `src/lib/safe-zone.ts`), nên scene chỉ cần fill `100%` và không tự canh lề.

**Dải caption:** `CAPTION_BAND_HEIGHT` = 170px ở đáy hộp an toàn, chứa component `Captions` (từng từ, `Video` render theo từng scene từ `words` trong manifest audio; cỡ chữ 64px có viền, 2 dòng vừa dải 170px).
Mọi scene bố cục trong `CONTENT_BOX` = **830 x 1130 px** (`SAFE_BOX` trừ dải caption), nên không đè lên caption.

**Nền tảng mục tiêu: TikTok và Facebook Reels** (không đăng Instagram Reels). Các con số này lấy từ số đo bên thứ ba cho TikTok và tỉ lệ safe zone quảng cáo của Meta
(14% trên, 35% dưới, 6% hai bên; cùng số cho Facebook và Instagram Reels), rồi **chủ kênh chủ động nới lề đáy** (từ 680 xuống 560, rồi xuống 420; đỉnh 230 xuống 200) để có thêm chỗ cho nội dung.
**Đánh đổi đã chấp nhận:** lề đáy nhỏ hơn nên đáy dải caption có thể đè lên vùng tên tài khoản và mô tả của TikTok/Facebook trên một số điện thoại.
Muốn an toàn hơn thì tăng `bottom` trong `safeZone` (`src/design/tokens.ts`); `SAFE_BOX`, `CONTENT_BOX` và mọi layout tự co theo.
**Trạng thái kiểm chứng:** chưa có số pixel chính thức cho TikTok hay Facebook Reels organic, nên các con số này **không phải giá trị pixel chính thức** và chưa được xác minh;
cần kiểm bằng video thật trên điện thoại (TikTok và Facebook) rồi chỉnh `safeZone`. Nghiên cứu trước đó dựa nhầm vào một trang Instagram nên đã bị loại.
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
- Cỡ chữ không cố định theo bảng: mỗi scene có helper tự chọn cỡ chữ lớn nhất vừa hộp (xem `content-guide.md`). Các cỡ nền: hook headline 72,
  diagram title 64 / node 40 / edge 32, code 22-40, terminal 24-36, tradeoff 28-52, summary 28-44, stat số 56-120, compare nhãn 36-48, callout 52-96, endcard headline 48-76.

## Backdrop và mood

`Backdrop` (`src/components/Backdrop/`) vẽ nền động toàn khung dưới mọi scene: 3 đốm sáng trôi, lưới mờ, hạt, vignette và nhiễu hạt phim. Màu lấy từ `moodPalettes` trong `src/design/mood.ts`
(các màu Catppuccin Mocha không có trong `tokens.ts` chỉ được khai báo ở file đó). `Video` chọn mood của mỗi scene (`scene.mood` hoặc `defaultMoodFor`) và pha màu giữa hai mood trong
**12 frame** hai bên ranh giới scene (`MOOD_WINDOW`).

| Mood       | Đốm sáng (3 màu)                | Nền gốc   | Ý nghĩa                        |
| ---------- | ------------------------------- | --------- | ------------------------------ |
| `problem`  | `#f38ba8`, `#fab387`, `#7a1f3d` | `#1c1019` | vấn đề, đau, nghịch lý         |
| `concept`  | `#89b4fa`, `#cba6f7`, `#3b2a7a` | `#12122a` | khái niệm, cơ chế              |
| `solution` | `#a6e3a1`, `#94e2d5`, `#1f6b5a` | `#0f1d1c` | lời giải, kết luận             |
| `warning`  | `#f9e2af`, `#fab387`, `#8a5a12` | `#1d1810` | đánh đổi, cẩn thận             |
| `neutral`  | `#b4befe`, `#5b5fc7`, `#cba6f7` | `#181825` | trung tính (mặc định terminal) |

Mood mặc định theo loại scene nằm ở `docs/content-guide.md` (mục Mood). Mood cũng chọn loại nhạc nền khi chạy `pnpm sfx`.

## Chuyển cảnh

`SceneTransition` trong `Video.tsx`: mỗi scene mờ vào và mờ ra trong tối đa **8 frame** (`FADE_FRAMES`) và trượt lên **28px** khi vào; độ dài scene không đổi. Nền (`Backdrop`) không bị cắt mà chuyển màu mượt.

## Icon

`src/components/Icon/` vẽ icon bằng SVG inline (đường nét, `currentColor`-style qua prop `color`). Tên hợp lệ (`ICONS`): `book`, `pages`, `list`, `search`, `database`, `server`, `tree`, `clock`, `bolt`,
`warning`, `check`, `cross`, `lock`, `cloud`, `code`, `user`. Thêm icon: thêm đường vẽ vào `ICON_PATHS` và tên vào `ICONS` trong `src/schemas/common.ts`. Tone `good`/`bad`/`neutral` ánh xạ `correct`/`wrong`/`diagram`.

## RichText

`RichText` (`src/components/RichText.tsx`) hiển thị markup `{màu|chữ}` với 4 màu: `accent`, `wrong`, `correct`, `diagram` (đúng các token trong `colors`); có tùy chọn `glow`. Parser thuần `src/lib/rich-text.ts`
(`parseRichText`, `stripMarkup`) không bao giờ ném lỗi: markup hỏng hiện chữ thường. Danh sách trường hỗ trợ: `content-guide.md`, mục Markup.

## Âm thanh (sound design)

Toàn bộ nhạc nền và SFX được **tổng hợp bằng code** (`pipeline/audio/`), không dùng file có sẵn. Lý do: không vướng giấy phép/bản quyền, kết quả xác định (cùng đầu vào cho cùng âm thanh) và không phải ghi vào `public/music/LICENSES.md`.

- **Nhạc nền** (`music.ts`): pad cộng + arp nhẹ + nhịp trầm, 108 BPM, mỗi mood một hợp âm/âm sắc riêng; các scene liền kề crossfade **1,2s**, mở đầu fade 0,8s, kết fade 2s.
- **SFX** (`sfx.ts`): `whoosh` (chuyển scene), `pop` (mỗi lần phần tử hiện đúng cue), `tick` (đếm số trong `stat`), `thud` (mở và kết video), `riser` (trước scene cuối).
- **Ducking** (`ducking.ts`): nhạc giảm **12 dB** và SFX giảm 4 dB khi người đọc nói (theo mốc từng từ trong manifest, không phân tích audio); attack 0,08s, release 0,45s, khoảng nghỉ < 0,35s vẫn giữ ducking.
- **Mức âm lượng**: bed được đặt thấp hơn giọng ~14 dB (LUFS), đỉnh bed <= 0,5. `pnpm sfx <id>` ghi `public/generated/audio/<id>/bed.wav` + `bed.json` (cần `pnpm tts <id>` trước);
  `Video` tự phát `bed.wav` nếu có. Sau khi render, `pnpm render`/`pnpm produce` chuẩn hóa MP4 về **-14 LUFS**, true peak <= -1,5 dBTP (loudnorm hai lượt, copy hình, `--no-normalize` để bỏ qua; không áp dụng khi render một đoạn `--frames`).

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

## Phong cách hiện tại (nền đen, vàng neon)

Theo ảnh tham khảo của chủ kênh: nền gần đen (`#0A0A0A`), chữ trắng, **vàng `#FFD60A` = khái niệm chính (có glow, mỗi màn hình chỉ một từ nhấn vàng)**,
**đỏ `#FF4D3D` = vấn đề/chậm**, **xanh `#3DDC84` = giải pháp/nhanh**, xám `#9A9A9A` cho nhãn phụ, cam `#FF8A3D` cho "đơn chờ" và chữ "đoán".
`Backdrop` chỉ còn một vầng sáng rất mờ theo mood (không doodle). Thẻ (`GlassCard`) là thẻ cửa sổ: nền `#141414`, viền mảnh `#262626`, có thể có thanh tiêu đề kiểu IDE
(`title`, ba chấm đỏ vàng xanh + tên file). `Kicker` là nhãn viền mảnh chữ vàng nhạt cùng chấm tiến độ tròn. Số lớn dùng `glow()` (không viền chữ). Phụ đề không còn nền viên thuốc:
chữ trắng 64px, từ đang đọc màu vàng. Code: từ khóa vàng, số đỏ, chuỗi xanh. Nhân vật `Mascot` là ảnh `public/mascot/default.png` (AI-generated by owner, ghi trong
`public/music/LICENSES.md`), đứng lệch phải ở vùng đáy, nhún nhẹ và phập phồng theo lời đọc (`mouthOpenAt`); chỉ để trang trí, có thể bị giao diện TikTok che một phần.
