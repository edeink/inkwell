import { runApp } from './app';

import Runtime from '@/runtime';

export { InteractiveCounterDemo } from './widgets/interactive-counter-demo';

export function setupInteractiveCounter(runtime: Runtime) {
  runApp(runtime);
}
