/** @jsxImportSource @/utils/compiler */

import { InteractiveCounterDemo } from './widgets/interactive-counter-demo';

import type Runtime from '@/runtime';

export function runApp(runtime: Runtime) {
  runtime.render(<InteractiveCounterDemo />);
}
