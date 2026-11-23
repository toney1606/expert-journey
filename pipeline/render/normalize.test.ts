import { describe, expect, it } from 'vitest';
import {
  correctionFilter,
  linearTargets,
  measureFilter,
  parseLoudnormMeasure,
  tempPathFor,
} from './normalize';

const sample = `[Parsed_loudnorm_0 @ 0x1]
{
	"input_i" : "-17.82",
	"input_tp" : "-1.54",
	"input_lra" : "4.30",
	"input_thresh" : "-28.10",
	"output_i" : "-14.50",
	"target_offset" : "0.50"
}`;

describe('loudnorm helpers', () => {
  it('parses the first-pass measurements', () => {
    expect(parseLoudnormMeasure(sample)).toEqual({
      inputI: -17.82,
      inputTp: -1.54,
      inputLra: 4.3,
      inputThresh: -28.1,
      targetOffset: 0.5,
    });
  });
  it('throws when a field is missing and maps -inf to -Infinity', () => {
    expect(() => parseLoudnormMeasure('nothing here')).toThrow(/input_i/);
    expect(parseLoudnormMeasure(sample.replace('-17.82', '-inf')).inputI).toBe(-Infinity);
  });
  it('builds a linear second-pass filter from the measurement', () => {
    const filter = correctionFilter({ ...parseLoudnormMeasure(sample), inputTp: -8 });
    expect(filter).toContain('I=-14:');
    expect(filter).toContain('measured_I=-17.82');
    expect(filter).toContain('offset=3.82');
    expect(filter).toContain('linear=true');
    expect(measureFilter).toContain('I=-14');
  });
  it('lowers the integrated target when -14 LUFS would exceed the true-peak limit', () => {
    // -17.82 LUFS with a -1.54 dBTP peak: +3.82 dB would put the peak at +2.3 dBTP -> ffmpeg would go dynamic
    const m = parseLoudnormMeasure(sample);
    const { targetI } = linearTargets(m);
    expect(targetI).toBeLessThan(-14);
    expect(m.inputTp + (targetI - m.inputI)).toBeLessThanOrEqual(-1.5);
    expect(correctionFilter(m)).toContain(`I=${targetI}:`);
  });
  it('never asks for an LRA below the source LRA', () => {
    expect(linearTargets({ ...parseLoudnormMeasure(sample), inputLra: 14.2 }).targetLra).toBe(15);
    expect(linearTargets(parseLoudnormMeasure(sample)).targetLra).toBe(11);
  });
});

describe('tempPathFor', () => {
  it('stays in the same directory, keeps the extension and never equals the input', () => {
    expect(tempPathFor('/a/b/out.mp4', 'x')).toBe('/a/b/out.normalized-x.mp4');
    const odd = tempPathFor('/a/b/clip.MOV', 'x');
    expect(odd).toBe('/a/b/clip.normalized-x.MOV');
    expect(tempPathFor('/a/b/noext', 'x')).toBe('/a/b/noext.normalized-x');
    for (const f of ['/a/out.mp4', '/a/out.mkv', '/a/out']) expect(tempPathFor(f)).not.toBe(f);
  });
});
