/** Colour names usable in `{name|text}` markup; each maps to a `colors` token. */
export const RICH_COLORS = ['accent', 'wrong', 'correct', 'diagram'] as const;
export type RichColor = (typeof RICH_COLORS)[number];

export type RichSegment = { text: string; color?: RichColor };

const isRichColor = (name: string): name is RichColor =>
  (RICH_COLORS as readonly string[]).includes(name);

const TAG_OPEN = /^\{([A-Za-z]+)\|/;

/** Index of the `}` that closes a group whose content starts at `from`, or -1 when unbalanced. */
const findClose = (text: string, from: number): number => {
  let depth = 1;
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '\\') {
      i += 1;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
};

const parseInto = (text: string, color: RichColor | undefined, out: RichSegment[]): void => {
  let plain = '';
  const flush = (): void => {
    if (plain) {
      out.push(color ? { text: plain, color } : { text: plain });
      plain = '';
    }
  };
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\' && (text[i + 1] === '{' || text[i + 1] === '}' || text[i + 1] === '\\')) {
      plain += text[i + 1];
      i += 2;
      continue;
    }
    if (ch === '{') {
      const open = TAG_OPEN.exec(text.slice(i));
      if (open?.[1]) {
        const contentStart = i + open[0].length;
        const close = findClose(text, contentStart);
        if (close !== -1) {
          flush();
          const name = open[1];
          parseInto(text.slice(contentStart, close), isRichColor(name) ? name : color, out);
          i = close + 1;
          continue;
        }
      }
    }
    plain += ch;
    i += 1;
  }
  flush();
};

/** Parse `{accent|words}` markup into coloured segments. Never throws; malformed markup stays plain. */
export const parseRichText = (text: string): RichSegment[] => {
  const raw: RichSegment[] = [];
  parseInto(text, undefined, raw);
  const merged: RichSegment[] = [];
  for (const segment of raw) {
    const last = merged[merged.length - 1];
    if (last && last.color === segment.color) {
      last.text += segment.text;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
};

/** The text without markup (for QA checks and captions). */
export const stripMarkup = (text: string): string =>
  parseRichText(text)
    .map((segment) => segment.text)
    .join('');
