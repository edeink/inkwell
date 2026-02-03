/** @jsxImportSource @/utils/compiler */
import { ResumeDemoApp } from './widgets/resume-demo-app';
import { ResumeProtectedApp } from './widgets/resume-protected-app';

import type Runtime from '@/runtime';
import type { ThemePalette } from '@/styles/theme';

import { Themes } from '@/styles/theme';

export { RESUME_PAGE_WIDTH } from './helpers/constants';
export { ResumeDemoApp } from './widgets/resume-demo-app';
export type { ResumeDemoAppProps } from './widgets/resume-demo-app';

export function runApp(runtime: Runtime, width: number, height: number, theme: ThemePalette) {
  return runtime.render(
    <ResumeProtectedApp width={width} height={height} theme={theme || Themes.light} mode="view" />,
  );
}

export function runExportApp(runtime: Runtime, width: number, height: number, theme: ThemePalette) {
  return runtime.render(
    <ResumeDemoApp width={width} height={height} theme={theme || Themes.light} mode="export" />,
  );
}
