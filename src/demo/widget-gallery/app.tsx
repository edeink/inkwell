/** @jsxImportSource @/utils/compiler */
import { WidgetGalleryDemo } from './widgets/widget-gallery-demo';

import Runtime from '@/runtime';

export function runApp(runtime: Runtime, width?: number, height?: number) {
  runtime.render(<WidgetGalleryDemo width={width} height={height} />);
}
