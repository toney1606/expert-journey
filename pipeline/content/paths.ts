import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Level } from '../../src/schemas/common';
import type { Curriculum } from '../../src/schemas/curriculum';

/**
 * Content layout:
 *   content/curriculum.json
 *   content/<level>/topics.json
 *   content/<level>/<ddmmyyyy>/<topic>/{research.md, interview-kit.json, video.json, code/, ...}
 *   content/samples/<id>/video.json
 * Video id = `<ddmmyyyy>-<topic>`; sample ids are free-form.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseIso = (iso: string): Date => {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new Error(`Expected an ISO date (YYYY-MM-DD), got "${iso}"`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
};

const toIso = (date: Date): string => date.toISOString().slice(0, 10);

/** "2026-11-22" -> "22112026". */
export const dayFolderName = (iso: string): string => {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new Error(`Expected an ISO date (YYYY-MM-DD), got "${iso}"`);
  return `${match[3]}${match[2]}${match[1]}`;
};

export const videoIdFor = (iso: string, topic: string): string => `${dayFolderName(iso)}-${topic}`;

export type Schedule = { date: string; slot: string; dayIndex: number };

/** Publishing date and slot of the n-th topic (0-based) of a level. Dates are derived from the config. */
export const scheduleFor = (config: Curriculum, level: Level, topicIndex: number): Schedule => {
  const levelIndex = config.levels.indexOf(level);
  if (levelIndex === -1) throw new Error(`Level "${level}" is not in the curriculum`);
  const perLevel = config.daysPerLevel * config.slots.length;
  if (!Number.isInteger(topicIndex) || topicIndex < 0 || topicIndex >= perLevel) {
    throw new Error(`Topic index ${topicIndex} is outside 0..${perLevel - 1} for level "${level}"`);
  }
  const dayIndex = Math.floor(topicIndex / config.slots.length);
  const date = parseIso(config.startDate);
  date.setUTCDate(date.getUTCDate() + levelIndex * config.daysPerLevel + dayIndex);
  return {
    date: toIso(date),
    slot: config.slots[topicIndex % config.slots.length] as string,
    dayIndex,
  };
};

/** Inverse of the day/slot split: topic index for a day (0-based) and slot (0-based) within a level. */
export const topicPosition = (config: Curriculum, dayIndex: number, slotIndex: number): number =>
  dayIndex * config.slots.length + slotIndex;

export const topicDir = (root: string, level: Level, iso: string, topic: string): string =>
  join(root, 'content', level, dayFolderName(iso), topic);

/** Absolute path of video.json for a video id, or undefined when no such video exists. */
export const findVideoFile = (root: string, id: string): string | undefined => {
  const content = join(root, 'content');
  const sample = join(content, 'samples', id, 'video.json');
  if (existsSync(sample)) return sample;
  const day = /^(\d{8})-(.+)$/.exec(id);
  if (!day || !existsSync(content)) return undefined;
  for (const level of readdirSync(content, { withFileTypes: true })) {
    if (!level.isDirectory()) continue;
    const file = join(content, level.name, day[1] as string, day[2] as string, 'video.json');
    if (existsSync(file)) return file;
  }
  return undefined;
};
