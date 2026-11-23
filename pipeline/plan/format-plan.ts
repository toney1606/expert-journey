import type { Level } from '../../src/schemas/common';
import { PLAN_STATUSES } from './build-plan';
import type { PlanEntry, PlanStatus } from './build-plan';

export type PlanFilter = { level?: Level; from?: string; to?: string };

const ICONS: Record<PlanStatus, string> = {
  planned: '.',
  stub: 'o',
  researched: 'R',
  scripted: 'S',
  voiced: 'V',
  rendered: '#',
};

const LABELS: Record<PlanStatus, string> = {
  planned: 'chưa có',
  stub: 'khung',
  researched: 'đã nghiên cứu',
  scripted: 'có kịch bản',
  voiced: 'có giọng',
  rendered: 'đã render',
};

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const dmy = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const weekday = (iso: string): string =>
  WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()] as string;

/** Compact Vietnamese table grouped by level and day, with totals per status per level. */
export const formatPlan = (plan: PlanEntry[], filter: PlanFilter = {}): string => {
  const rows = plan.filter(
    (e) =>
      (!filter.level || e.level === filter.level) &&
      (!filter.from || e.date >= filter.from) &&
      (!filter.to || e.date <= filter.to),
  );
  if (rows.length === 0) return 'Không có chủ đề nào khớp bộ lọc.';
  const lines: string[] = [];
  const levels = [...new Set(rows.map((e) => e.level))];
  for (const level of levels) {
    const inLevel = rows.filter((e) => e.level === level);
    lines.push(`== ${level.toUpperCase()} (${inLevel.length} video) ==`);
    let lastDay = '';
    for (const e of inLevel) {
      if (e.dayFolder !== lastDay) {
        lastDay = e.dayFolder;
        lines.push(`Ngày ${e.dayIndex + 1}  ${dmy(e.date)} ${weekday(e.date)}`);
      }
      const flags = e.flags.length ? ` [${e.flags.join(',')}]` : '';
      lines.push(
        `  ${e.slot} ${ICONS[e.status]} ${LABELS[e.status].padEnd(13)} ${e.topic}${flags}`,
      );
    }
    const counts = PLAN_STATUSES.map(
      (s) => [s, inLevel.filter((e) => e.status === s).length] as const,
    )
      .filter(([, n]) => n > 0)
      .map(([s, n]) => `${LABELS[s]} ${n}`);
    lines.push(`Tổng ${level}: ${counts.join(', ')}`, '');
  }
  return lines.join('\n').trimEnd();
};
