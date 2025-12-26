/** @jsxImportSource @/utils/compiler */
import { MindmapDemo } from './widgets/mindmap-demo';

import type Runtime from '@/runtime';

export function runApp(runtime: Runtime, size: { width: number; height: number }) {
  runtime.render(<MindmapDemo width={size.width} height={size.height} />);
}
