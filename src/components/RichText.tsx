import { colors } from '../design/tokens';
import { parseRichText } from '../lib/rich-text';

type Props = {
  /** Text with `{accent|words}` markup (accent, wrong, correct, diagram). */
  text: string;
  /** Add a soft glow in the span colour. */
  glow?: boolean;
};

/** Renders markup as coloured spans; inherits font, size and colour from its parent. */
export const RichText: React.FC<Props> = ({ text, glow = false }) => (
  <>
    {parseRichText(text).map((segment, index) =>
      segment.color ? (
        <span
          key={index}
          style={{
            color: colors[segment.color],
            textShadow: glow ? `0 0 24px ${colors[segment.color]}66` : undefined,
          }}
        >
          {segment.text}
        </span>
      ) : (
        <span key={index}>{segment.text}</span>
      ),
    )}
  </>
);
