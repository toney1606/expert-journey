import { colors, fontFamily } from '../../design/tokens';
import { tokenizeLine } from '../../scenes/CodeDiff/tokenize';
import { tokenColors } from '../../scenes/CodeDiff/syntax';

/** Smallest code size that stays readable on a phone (px). */
export const CODE_BLOCK_MIN_FONT = 40;

type CodeBlockProps = {
  code: string;
  language?: string;
  fontSize?: number;
  /** 0-based line indexes drawn in a highlight colour (e.g. the "Rows Removed" line). */
  highlightLines?: readonly number[];
  highlightColor?: string;
  /** 0..1 opacity of the highlight (animate it from the caller, e.g. a blink). */
  highlightAmount?: number;
  style?: React.CSSProperties;
};

/** Syntax-highlighted code card. Long lines wrap instead of shrinking the font. */
export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'sql',
  fontSize = CODE_BLOCK_MIN_FONT,
  highlightLines = [],
  highlightColor = colors.wrong,
  highlightAmount = 1,
  style,
}) => (
  <div
    style={{
      background: colors.card,
      border: `2px solid ${colors.border}`,
      borderRadius: 28,
      padding: '20px 24px',
      boxSizing: 'border-box',
      fontFamily: fontFamily.code,
      fontSize,
      lineHeight: 1.45,
      color: colors.text,
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
      ...style,
    }}
  >
    {code.split('\n').map((line, row) => {
      const lit = highlightLines.includes(row);
      return (
        <div
          key={row}
          style={{
            background: lit
              ? `color-mix(in srgb, ${highlightColor} ${Math.round(28 * highlightAmount)}%, transparent)`
              : undefined,
            borderRadius: 8,
            margin: '0 -8px',
            padding: '0 8px',
            minHeight: fontSize * 1.45,
          }}
        >
          {tokenizeLine(line, language).map((token, i) => (
            <span key={i} style={{ color: tokenColors[token.type] }}>
              {token.text}
            </span>
          ))}
        </div>
      );
    })}
  </div>
);
