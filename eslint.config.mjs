import { config as remotionConfig } from '@remotion/eslint-config-flat';
import tseslint from 'typescript-eslint';

const CSS_ANIMATION_MESSAGE =
  'CSS transition/animation is forbidden. Drive animation with useCurrentFrame(), spring() and interpolate().';

export default tseslint.config(
  ...remotionConfig,
  { ignores: ['coverage/**', 'public/generated/**', 'node_modules/**'] },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Render layer: best-effort ban on CSS transitions/animations in style objects.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Property[key.name=/^(transition|animation)/]',
          message: CSS_ANIMATION_MESSAGE,
        },
        {
          selector: 'Property[key.value=/^(transition|animation)/]',
          message: CSS_ANIMATION_MESSAGE,
        },
        {
          selector: 'Literal[value=/(^|[;\\s])(transition|animation)(-[a-z]+)?\\s*:/]',
          message: CSS_ANIMATION_MESSAGE,
        },
      ],
    },
  },
);
