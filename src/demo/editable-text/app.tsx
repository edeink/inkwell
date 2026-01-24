/** @jsxImportSource @/utils/compiler */

/**
 * 文件用途：editable-text 示例在 Runtime 中的渲染入口。
 * 主要功能：
 * - 组合 ScrollView 与根容器，挂载 EditableTextDemoWidget
 * - 对外导出 runApp 便于 React 外壳在 resize/theme 变化时重复渲染
 */
import {
  EditableTextDemoWidget,
  type EditableTextDemoWidgetProps,
} from './widget/editable-text-demo';

import type { RichSelectionInfo } from './widget/rich-text-editor';

import { Container, ScrollView } from '@/core';
import Runtime from '@/runtime';

export type { RichSelectionInfo } from './widget/rich-text-editor';

export { EditableTextDemoWidget as EditableTextDemo };

/**
 * 将 editable-text 示例渲染到指定的 Runtime。
 * @param runtime - InkWell Runtime 实例
 * @param width - 画布宽度（像素）
 * @param height - 画布高度（像素）
 * @param theme - 示例主题（可选）
 * @param onRichSelectionInfo - 富文本选区信息回调（用于 devtools/联动展示）
 */
export function runApp(
  runtime: Runtime,
  width: number,
  height: number,
  theme: EditableTextDemoWidgetProps['theme'],
  onRichSelectionInfo?: (info: RichSelectionInfo) => void,
) {
  runtime.render(
    <ScrollView
      width={width}
      height={height}
      enableBounceVertical={true}
      enableBounceHorizontal={false}
    >
      <Container key="editable-text-root-container" minWidth={width} minHeight={height}>
        <EditableTextDemoWidget theme={theme} onRichSelectionInfo={onRichSelectionInfo} />
      </Container>
    </ScrollView>,
  );
}
