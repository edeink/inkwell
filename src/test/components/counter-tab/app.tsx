/** @jsxImportSource @/utils/compiler */

import { TemplateElement } from './counter';

import type Runtime from '@/runtime';

export function runApp(runtime: Runtime) {
  runtime.render(<TemplateElement />);
}
