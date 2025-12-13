/** @jsxImportSource @/utils/compiler */

import { Template } from './counter';

import type Runtime from '@/runtime';

export function runApp(runtime: Runtime) {
  runtime.render(<Template />);
}
