/** @jsxImportSource @/utils/compiler */

import {
  EditableTextDemoWidget,
  type EditableTextDemoWidgetProps,
} from './widget/editable-text-demo';

import type { RichSelectionInfo } from './widget/rich-text-editor';

import { Container, ScrollView } from '@/core';
import Runtime from '@/runtime';

export type { RichSelectionInfo } from './widget/rich-text-editor';

export { EditableTextDemoWidget as EditableTextDemo };

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
