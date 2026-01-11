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

export interface ColumnHeadersProps extends WidgetProps {
  model: SpreadsheetModel;
  theme: ThemePalette;
  scrollX: number;
  viewportWidth: number;
  selections?: SelectionRange[];
  onResizeStart: (index: number, e: InkwellEvent) => void;
  onHeaderClick: (index: number, e: InkwellEvent) => void;
}

export class ColumnHeaders extends StatefulWidget<ColumnHeadersProps> {
  private getColumnName(index: number): string {
    let name = '';
    let i = index;
    while (i >= 0) {
      name = String.fromCharCode(65 + (i % 26)) + name;
      i = Math.floor(i / 26) - 1;
    }
    return name;
  }

  render() {
    const { model, theme, scrollX, viewportWidth, selections, onResizeStart, onHeaderClick } =
      this.props;
    const { config } = model;

    const startCol = model.getColIndexAt(scrollX);
    const endCol = model.getColIndexAt(scrollX + viewportWidth) + 1;

    // 统一处理选区
    const activeSelections = selections || [];

    const headers: JSXElement[] = [];

    for (let c = startCol; c <= endCol; c++) {
      if (c >= model.getColCount()) {
        break;
      }
      const colWidth = model.getColWidth(c);
      // 我们减去 scrollX，因为表头固定在单独的容器中，
      // 但必须随着向右滚动而向左移动。
      const colLeft = model.getColOffset(c) - scrollX;

      // 如果超出视图则跳过
      if (colLeft + colWidth < 0 || colLeft > viewportWidth) {
        continue;
      }

      const colName = this.getColumnName(c);
      const isSelected = activeSelections.some(
        (sel) => c >= Math.min(sel.startCol, sel.endCol) && c <= Math.max(sel.startCol, sel.endCol),
      );

      headers.push(
        <Positioned
          key={`col-header-${c}`}
          left={colLeft}
          top={0}
          width={colWidth - 1}
          height={config.headerHeight - 1}
        >
          <Container
            color={isSelected ? theme.component.headerBgActive : theme.component.headerBg}
            onPointerDown={(e) => onHeaderClick(c, e)}
          >
            <Center>
              <Text
                text={colName}
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
          key={`col-resizer-${c}`}
          left={colLeft + colWidth - 4}
          top={0}
          width={8}
          height={config.headerHeight}
          zIndex={10}
        >
          <Container
            color="transparent"
            cursor="col-resize"
            onPointerDown={(e) => onResizeStart(c, e)}
          />
        </Positioned>,
      );
    }

    return (
      <Container
        width={viewportWidth}
        height={config.headerHeight}
        color={theme.component.headerBg}
      >
        <Stack>{headers as unknown as WidgetProps[]}</Stack>
      </Container>
    );
  }
}
