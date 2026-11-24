import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { VideoSchema } from '../../src/schemas/video';
import { findVideoFile } from '../content/paths';

/**
 * Eleven v4 delivery markup per scene (audio tags, ellipses for pauses, CAPS for stress). The words are the
 * approved narration, untouched; `text` stays the clean voice so cues and captions keep matching it.
 */
const DELIVERY: Record<string, string> = {
  hook: `[confident, punchy] Một câu query chạy mười hai mili giây suốt sáu tháng. [brief pause] Sáng nay... một phẩy hai giây. [amazed] Chậm gấp TRĂM lần! Không ai đổi code. Không ai đổi index. Dữ liệu gần như y nguyên. [leaning in, curious] Vậy chuyện gì xảy ra? [low, conspiratorial whisper] Database không biết trước kết quả. Nó ĐOÁN. [brief pause] [slowly, ominous] Và hôm nay... nó đoán SAI.`,
  'three-reads': `[calm, matter-of-fact] Trước hết: database rất lười đọc đĩa, vì đĩa là thứ chậm nhất. Nó không đọc từng dòng, mà đọc từng khối, gọi là page. Index chính là trang mục lục. Mỗi trang chỉ tới ba trăm trang con. Ba tầng như vậy phủ hai mươi bảy triệu dòng. [impressed] Tìm một người trong mười triệu người, chỉ cần khoảng ba lần đọc. [brief pause] BA. [softly, deadpan] Không phải mười triệu.`,
  cost: `[clears throat] [explaining, steady] Nhưng không phải lúc nào nó cũng dùng index. Với mỗi query, nó tính giá hai đường: đi qua index, hay đọc cả bảng. Nhảy tới page ngẫu nhiên đắt hơn đọc liền, mặc định PostgreSQL là gấp bốn lần. Nhân với số dòng nó nghĩ là khớp, ra giá. Đường nào rẻ hơn thì đi. [leaning in] Để ý chữ... NGHĨ: [hushed] nó không đếm thật, nó dựa vào thống kê. [brief pause] [significant] Cả câu chuyện sáng nay nằm ở chữ nghĩ đó.`,
  setup: `[storytelling, warm] Bảng orders, mười triệu dòng. Lấy mười đơn chờ xử lý mới nhất, có index trên ngày tạo. Đơn chờ chiếm năm phần trăm. [thinking out loud] Database nhẩm: hai mươi đơn có một đơn chờ, đi lùi từ đơn mới nhất, khoảng hai trăm đơn là đủ mười. [pleased] Rẻ quá, chọn luôn! [brief pause] [quietly, wistful] Và suốt sáu tháng... nó đúng.`,
  twist: `[narrative, rising tension] Rồi công ty bật tự động duyệt. Đơn mới được xử lý ngay, đơn còn chờ chỉ còn là đơn cũ, nằm sâu phía sau. Nhưng chúng vẫn chiếm năm phần trăm, nên thống kê không đổi. Database vẫn tin: hai trăm đơn là đủ. [sighs] Thực tế, nó phải bỏ qua HÀNG TRIỆU đơn đã xử lý, từng đơn một, mới chạm tới đơn chờ đầu tiên. [brief pause] Cùng query. Cùng index. [low, serious] Thứ sai là một giả định: đơn chờ nằm rải đều. [brief pause] [slowly] Giờ chúng dồn về một phía.`,
  fix: `[clears throat] [confident, instructive] Chạy EXPLAIN ANALYZE, bạn sẽ thấy nó đi ngược index từ mới về cũ. [mimicking the database] Mỗi đơn nó hỏi: đơn chờ không? Không, bỏ. Không, bỏ. [leaning in] Con số nằm ở dòng Rows Removed by Filter. Thấy nó lên hàng triệu, là bạn bắt được thủ phạm.
[wry] Phản xạ của nhiều người là chạy ANALYZE. [sighs] Chẳng đổi được gì, vì thống kê đâu có sai: nó biết năm phần trăm là đơn chờ, chỉ không biết đơn chờ nằm Ở ĐÂU.
[energized, decisive] Nên đừng bắt nó đoán nữa! Tạo index trên trạng thái, rồi đến ngày tạo. Đơn chờ nằm sát nhau, đã sắp theo ngày. Nó nhảy thẳng tới, đọc mười đơn rồi dừng. [brief pause] [triumphant, softly] Từ hàng triệu dòng... còn MƯỜI.`,
  'index-types': `[upbeat, brisk] Index vừa rồi là composite. Còn vài loại nữa, mỗi loại giải một bài toán. B+Tree, mặc định: tìm đúng một giá trị, một khoảng, hoặc cần thứ tự. Unique: cấm trùng, như email. Composite: nhiều cột, thứ tự cột quyết định query nào được giúp. Covering: chứa đủ cột query cần, khỏi quay về bảng. Partial: chỉ giữ dòng thỏa điều kiện, như năm phần trăm đơn chờ, nhỏ hơn hai chục lần, ghi cũng nhẹ hơn. [brief pause] Cuối cùng là full-text, để tìm từ trong văn bản, [dry, amused] chỗ B+Tree bó tay.`,
  cliffhanger: `[serious, challenging] Giờ đến thử thách. Index nhanh vì giá trị đã sắp xếp, nhưng sắp xếp không có nghĩa là nó biết thứ hạng. Danh sách đơn hàng, trang một chỉ vài mili giây. [leaning in] Kéo tới trang mười nghìn thì chậm hẳn, dù có index ngày tạo. [hushed, intrigued] Vì sao, và sửa thế nào? [friendly, upbeat] Câu này hay gặp khi phỏng vấn. Trả lời ở bình luận, mình ghim đáp án đúng.`,
};

/** `pnpm exec tsx pipeline/tts/import-prepare.ts <videoId>`: writes the paste list + index.json for the import provider. */
const videoId = process.argv[2];
if (!videoId) throw new Error('usage: import-prepare.ts <videoId>');
const root = process.cwd();
const path = findVideoFile(root, videoId);
if (!path) throw new Error(`Video not found: ${videoId}`);
const video = VideoSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
const dir = join(root, 'public', 'generated', 'audio-import', videoId);
mkdirSync(dir, { recursive: true });
const entries = video.scenes.map((scene, i) => ({
  file: `${String(i + 1).padStart(2, '0')}-${scene.id}.mp3`,
  text: scene.voice,
  ttsText: DELIVERY[scene.id] ?? scene.voice,
}));
writeFileSync(join(dir, 'index.json'), `${JSON.stringify(entries, null, 2)}\n`);
const paste = entries
  .map((e, i) => `=== ${i + 1}/${entries.length}  save as: ${e.file} ===\n${e.ttsText}\n`)
  .join('\n');
writeFileSync(join(dir, 'paste-list.txt'), paste);
console.log(dir);
