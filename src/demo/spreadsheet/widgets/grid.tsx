/** @jsxImportSource @/utils/compiler */
import type { SpreadsheetModel } from '../spreadsheet-model';
import type { SelectionRange } from '../types';
import type { WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events/types';
import type { ThemePalette } from '@/styles/theme';
import type { JSXElement } from '@/utils/compiler/jsx-runtime';

import { Container, Positioned, Stack, Text } from '@/core';
import { StatefulWidget } from '@/core/state/stateful';
import { TextAlign, TextAlignVertical } from '@/core/text';

export interface SpreadsheetGridProps extends WidgetProps {
  model: SpreadsheetModel;
  theme: ThemePalette;
  scrollX: number;
  scrollY: number;
  viewportWidth: number;
  viewportHeight: number;
  selection: SelectionRange | null;
  showGridLines: boolean;
  gridLineColor?: string;
  /**
   * 外部数据版本号
   */
  dataVersion?: number;
  /**
   * 模型哈希值，用于强制更新
   */
  modelHash?: string;
  onCellDown: (row: number, col: number, e: InkwellEvent) => void;
  onCellDoubleClick: (row: number, col: number) => void;
}

export class SpreadsheetGrid extends StatefulWidget<SpreadsheetGridProps> {
  render() {
    const {
      model,
      theme,
      scrollX,
      scrollY,
      viewportWidth,
      viewportHeight,
      selection,
      showGridLines,
      onCellDown,
      onCellDoubleClick,
    } = this.props;

    // 计算可见区域
    // 增加 1 行/列的缓冲区以防止闪烁
    const startRow = model.getRowIndexAt(scrollY);
    const endRow = model.getRowIndexAt(scrollY + viewportHeight) + 1;
    const startCol = model.getColIndexAt(scrollX);
    const endCol = model.getColIndexAt(scrollX + viewportWidth) + 1;

    const cells: JSXElement[] = [];

    // 渲染单元格
    for (let r = startRow; r <= endRow; r++) {
      if (r >= model.getRowCount()) {
        break;
      }
      const rowHeight = model.getRowHeight(r);
      const rowTop = model.getRowOffset(r);

      // 优化：如果完全在视图外则跳过（虽然索引计算应该已经处理了大部分情况）
      if (rowTop + rowHeight < scrollY || rowTop > scrollY + viewportHeight) {
        continue;
      }

      for (let c = startCol; c <= endCol; c++) {
        if (c >= model.getColCount()) {
          break;
        }
        const colWidth = model.getColWidth(c);
        const colLeft = model.getColOffset(c);

        if (colLeft + colWidth < scrollX || colLeft > scrollX + viewportWidth) {
          continue;
        }

        const displayWidth = showGridLines ? colWidth - 1 : colWidth;
        const displayHeight = showGridLines ? rowHeight - 1 : rowHeight;

        const cellData = model.getCell(r, c);
        const isSelected =
          selection &&
          r >= Math.min(selection.startRow, selection.endRow) &&
          r <= Math.max(selection.startRow, selection.endRow) &&
          c >= Math.min(selection.startCol, selection.endCol) &&
          c <= Math.max(selection.startCol, selection.endCol);

        const style = cellData?.style || {};

        // 确保 style.color 有默认值
        const textColor = style.color || theme.text.primary;

        cells.push(
          <Positioned
            key={`cell-${r}-${c}`}
            left={colLeft}
            top={rowTop}
            width={displayWidth}
            height={displayHeight}
          >
            <Container
              color={isSelected ? theme.primary + '1A' : theme.background.base}
              // 显式设置 pointerEvent="auto" 以确保能接收事件
              pointerEvent="auto"
              onPointerDown={(e) => {
                onCellDown(r, c, e);
              }}
              // 使用 onDoubleClick 符合 React 规范，且确保 EventDispatcher 能正确解析
              onDoubleClick={() => {
                onCellDoubleClick(r, c);
              }}
            >
              <Text
                // 文本不响应事件，让事件冒泡到 Container
                pointerEvent="none"
                text={model.getDisplayValue(r, c)}
                fontSize={14}
                color={textColor}
                textAlign={(style.textAlign as TextAlign) || TextAlign.Left}
                textAlignVertical={TextAlignVertical.Center}
              />
            </Container>
          </Positioned>,
        );
      }
    }

    // 渲染选中区域边框
    if (selection) {
      const { startRow, endRow, startCol, endCol } = selection;
      const minR = Math.min(startRow, endRow);
      const maxR = Math.max(startRow, endRow);
      const minC = Math.min(startCol, endCol);
      const maxC = Math.max(startCol, endCol);

      const x = model.getColOffset(minC);
      const y = model.getRowOffset(minR);
      const w = model.getColOffset(maxC) + model.getColWidth(maxC) - x;
      const h = model.getRowOffset(maxR) + model.getRowHeight(maxR) - y;

      cells.push(
        <Positioned
          key="selection-border"
          pointerEvent="none"
          left={x}
          top={y}
          width={w}
          height={h}
        >
          <Container color="transparent" border={{ width: 2, color: theme.primary }} />
        </Positioned>,
      );
    }

    return (
      <Container width={model.getTotalWidth()} height={model.getTotalHeight()}>
        <Stack>{cells as unknown as WidgetProps[]}</Stack>
      </Container>
    );
  }
}
