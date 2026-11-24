import { z } from 'zod';

/** Top chip of a scene: "THIẾT LẬP" with progress dots (step of total). */
export const KickerPropSchema = z.strictObject({
  label: z.string().min(1),
  step: z.number().int().min(1),
  total: z.number().int().min(1),
});

export type KickerProp = z.output<typeof KickerPropSchema>;
