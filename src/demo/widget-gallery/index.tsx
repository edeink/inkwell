import { runApp } from './app';

import Runtime from '@/runtime';

export function setupWidgetGallery(runtime: Runtime, width: number, height: number) {
  runApp(runtime, width, height);
}
