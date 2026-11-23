import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Level } from '../../src/schemas/common';
import { SCAFFOLD_MARKER, buildPlan } from './build-plan';
import type { PlanEntry } from './build-plan';

const dmy = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export const researchTemplate = (e: PlanEntry): string =>
  [
    SCAFFOLD_MARKER,
    '',
    `# ${e.title}`,
    '',
    `- Level: ${e.level}`,
    `- Ngày đăng: ${dmy(e.date)} lúc ${e.slot}`,
    `- Video id: ${e.videoId}`,
    '',
    '## Câu hỏi phỏng vấn',
    '',
    e.question,
    '',
    '## Vì sao nhà tuyển dụng hỏi',
    '',
    e.entry.why,
    '',
    '## Nguồn đã xác minh',
    '',
    ...e.entry.sources.map((s) => `- [${s.title}](${s.url})`),
    '',
    '## Câu trả lời mạnh / yếu',
    '',
    'TODO',
    '',
    '## Các khẳng định cần kiểm chứng',
    '',
    '| Khẳng định | Nguồn | VERIFIED/UNVERIFIED |',
    '| ---------- | ----- | ------------------- |',
    '| TODO       | TODO  | UNVERIFIED          |',
    '',
    '## Hiểu lầm phổ biến',
    '',
    'TODO',
    '',
    '## Khác biệt giữa các engine/ngôn ngữ',
    '',
    'TODO',
    '',
    '## Ý tưởng cảnh (hook, ẩn dụ, số liệu thật cần đo, thuật ngữ)',
    '',
    'TODO',
    '',
  ].join('\n');

/** Create research.md stubs for topics that have no folder yet. Never touches an existing folder. Returns created file paths. */
export const scaffoldPlan = ({ root, level }: { root: string; level?: Level }): string[] => {
  const created: string[] = [];
  for (const e of buildPlan({ root })) {
    if (level && e.level !== level) continue;
    if (existsSync(e.dir)) continue;
    mkdirSync(e.dir, { recursive: true });
    const file = join(e.dir, 'research.md');
    writeFileSync(file, researchTemplate(e), { flag: 'wx' });
    created.push(file);
  }
  return created;
};
