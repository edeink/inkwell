import { runApp } from './app';

import Runtime from '@/runtime';

export { WidgetGalleryDemo } from './widgets/widget-gallery-demo';

export function setupWidgetGallery(runtime: Runtime, width: number, height: number) {
  runApp(runtime, width, height);
}
