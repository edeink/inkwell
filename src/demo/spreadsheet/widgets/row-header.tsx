/** @jsxImportSource @/utils/compiler */
import type { SpreadsheetModel } from '../spreadsheet-model';
import type { SelectionRange } from '../types';
import type { WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events/types';
import type { ThemePalette } from '@/styles/theme';
import type { JSXElement } from '@/utils/compiler/jsx-runtime';

import { Center, Container, Positioned, Stack, Text } from '@/core';
import { StatefulWidget } from '@/core/state/stateful';
import { TextAlign, TextAlignVertical } from '@/core/text';

export interface RowHeadersProps extends WidgetProps {
  model: SpreadsheetModel;
  theme: ThemePalette;
  scrollY: number;
  viewportHeight: number;
  selections?: SelectionRange[];
  onResizeStart: (index: number, e: InkwellEvent) => void;
  onHeaderClick: (index: number, e: InkwellEvent) => void;
}

export class RowHeaders extends StatefulWidget<RowHeadersProps> {
  render() {
    const { model, theme, scrollY, viewportHeight, selections, onResizeStart, onHeaderClick } =
      this.props;
    const { config } = model;

    const startRow = model.getRowIndexAt(scrollY);
    const endRow = model.getRowIndexAt(scrollY + viewportHeight) + 1;

    // 统一处理选区
    const activeSelections = selections || [];

    const headers: JSXElement[] = [];

    for (let r = startRow; r <= endRow; r++) {
      if (r >= model.getRowCount()) {
        break;
      }
      const rowHeight = model.getRowHeight(r);
      const rowTop = model.getRowOffset(r) - scrollY;

      if (rowTop + rowHeight < 0 || rowTop > viewportHeight) {
        continue;
      }

      const isSelected = activeSelections.some(
        (sel) => r >= Math.min(sel.startRow, sel.endRow) && r <= Math.max(sel.startRow, sel.endRow),
      );

      headers.push(
        <Positioned
          key={`row-header-${r}`}
          left={0}
          top={rowTop}
          width={config.headerWidth - 1}
          height={rowHeight - 1}
        >
          <Container
            color={isSelected ? theme.component.headerBgActive : theme.component.headerBg}
            onPointerDown={(e) => onHeaderClick(r, e)}
          >
            <Center>
              <Text
                text={`${r + 1}`}
                fontSize={12}
                color={theme.text.secondary}
                textAlign={TextAlign.Center}
                textAlignVertical={TextAlignVertical.Center}
              />
            </Center>
          </Container>
        </Positioned>,
      );

      // 调整大小的手柄
      headers.push(
        <Positioned
          key={`row-resizer-${r}`}
          left={0}
          top={rowTop + rowHeight - 4}
          width={config.headerWidth}
          height={8}
          zIndex={10}
        >
          <Container
            color="transparent"
            cursor="row-resize"
            onPointerDown={(e) => onResizeStart(r, e)}
          />
        </Positioned>,
      );
    }

    return (
      <Container
        width={config.headerWidth}
        height={viewportHeight}
        color={theme.component.headerBg}
      >
        <Stack>{headers as unknown as WidgetProps[]}</Stack>
      </Container>
    );
  }
}
