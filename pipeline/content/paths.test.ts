import { describe, expect, it } from 'vitest';
import type { Curriculum } from '../../src/schemas/curriculum';
import { dayFolderName, scheduleFor, topicPosition, videoIdFor } from './paths';

const config: Curriculum = {
  startDate: '2026-11-22',
  slots: ['11:30', '19:30'],
  daysPerLevel: 14,
  levels: ['intern', 'fresher', 'junior', 'middle', 'senior', 'expert'],
};

describe('dayFolderName / videoIdFor', () => {
  it('formats ISO dates as ddmmyyyy', () => {
    expect(dayFolderName('2026-11-22')).toBe('22112026');
    expect(dayFolderName('2027-01-03')).toBe('03012027');
  });
  it('builds the video id from date and topic', () => {
    expect(videoIdFor('2026-12-20', 'database-index')).toBe('20122026-database-index');
  });
  it('rejects malformed dates', () => {
    expect(() => dayFolderName('22/11/2026')).toThrow();
  });
});

describe('scheduleFor', () => {
  it('starts the first level on startDate with the first slot', () => {
    expect(scheduleFor(config, 'intern', 0)).toEqual({
      date: '2026-11-22',
      slot: '11:30',
      dayIndex: 0,
    });
    expect(scheduleFor(config, 'intern', 1)).toEqual({
      date: '2026-11-22',
      slot: '19:30',
      dayIndex: 0,
    });
  });
  it('moves to the next day after all slots are used', () => {
    expect(scheduleFor(config, 'intern', 2)).toEqual({
      date: '2026-11-23',
      slot: '11:30',
      dayIndex: 1,
    });
  });
  it('starts each level right after the previous one (14 days later)', () => {
    expect(scheduleFor(config, 'fresher', 0).date).toBe('2026-12-06');
    expect(scheduleFor(config, 'junior', 0).date).toBe('2026-12-20');
    expect(scheduleFor(config, 'expert', 27)).toEqual({
      date: '2027-02-13',
      slot: '19:30',
      dayIndex: 13,
    });
  });
  it('crosses month and year boundaries correctly', () => {
    expect(scheduleFor(config, 'junior', 27).date).toBe('2027-01-02');
    expect(scheduleFor(config, 'middle', 0).date).toBe('2027-01-03');
    expect(scheduleFor(config, 'senior', 0).date).toBe('2027-01-17');
  });
  it('rejects topic positions beyond the level length and unknown levels', () => {
    expect(() => scheduleFor(config, 'intern', 28)).toThrow();
    expect(() => scheduleFor({ ...config, levels: ['intern'] }, 'senior', 0)).toThrow();
  });
});

describe('topicPosition', () => {
  it('maps day and slot back to a topic index', () => {
    expect(topicPosition(config, 3, 1)).toBe(7);
  });
});
