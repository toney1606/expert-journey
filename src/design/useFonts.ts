import { useEffect, useState } from 'react';
import { staticFile, useDelayRender } from 'remotion';
import { FONT_FILES } from './fonts';

let loading: Promise<void> | undefined;

const loadAll = (): Promise<void> => {
  loading ??= Promise.all(
    FONT_FILES.map(async (font) => {
      const face = new FontFace(
        font.family,
        `url('${staticFile(`fonts/${font.file}`)}') format('woff2')`,
        { weight: font.weight, unicodeRange: font.unicodeRange, display: 'block' },
      );
      await face.load();
      document.fonts.add(face);
    }),
  ).then(() => undefined);
  return loading;
};

/** Blocks rendering until all local fonts are loaded; fails the render if any is missing. */
export const useFonts = (): void => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender('Loading fonts'));

  useEffect(() => {
    loadAll()
      .then(() => continueRender(handle))
      .catch((error: unknown) => cancelRender(error));
  }, [handle, continueRender, cancelRender]);
};
