/** @jsxImportSource @/utils/compiler */
import { CompGalleryRoot } from './widgets/comp-gallery-root';

import Runtime from '@/runtime';
import { Themes, type ThemePalette } from '@/styles/theme';

function resolveViewportSize(
  runtime: Runtime,
  width: number,
  height: number,
): { width: number; height: number } {
  if (width > 0 && height > 0) {
    return { width, height };
  }

  const rect = runtime.container?.getBoundingClientRect?.();
  const w = rect?.width ?? 0;
  const h = rect?.height ?? 0;

  if (w > 0 && h > 0) {
    return { width: w, height: h };
  }

  return { width: 800, height: 600 };
}

export function runApp(runtime: Runtime, width: number, height: number, theme: ThemePalette) {
  const { width: viewportWidth, height: viewportHeight } = resolveViewportSize(
    runtime,
    width,
    height,
  );
  runtime.render(
    <CompGalleryRoot width={viewportWidth} height={viewportHeight} theme={theme || Themes.light} />,
  );
}
