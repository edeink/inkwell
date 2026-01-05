/** @jsxImportSource @/utils/compiler */
import type { SpreadsheetModel } from '../spreadsheet-model';
import type { CellPosition, SelectionRange } from '../types';
import type { WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events/types';
import type { ThemePalette } from '@/styles/theme';
import type { JSXElement } from '@/utils/compiler/jsx-runtime';

import { Container, Positioned, Stack, Text } from '@/core';
import { EditableText } from '@/core/editable-text';
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
  editingCell: CellPosition | null;
  showGridLines: boolean;
  onCellDown: (row: number, col: number, e: InkwellEvent) => void;
  onCellDoubleClick: (row: number, col: number) => void;
  onEditFinish: (value: string) => void;
  onEditCancel: () => void;
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
      editingCell,
      showGridLines,
      gridLineColor,
      onCellDown,
      onCellDoubleClick,
      onEditFinish,
      onEditCancel,
    } = this.props;

    const { config } = model;

    // 计算可见区域
    // 增加 1 行/列的缓冲区以防止闪烁
    const startRow = model.getRowIndexAt(scrollY);
    const endRow = model.getRowIndexAt(scrollY + viewportHeight) + 1;
    const startCol = model.getColIndexAt(scrollX);
    const endCol = model.getColIndexAt(scrollX + viewportWidth) + 1;

    const cells: JSXElement[] = [];

    // 渲染单元格
    for (let r = startRow; r <= endRow; r++) {
      if (r >= config.rowCount) {
        break;
      }
      const rowHeight = model.getRowHeight(r);
      const rowTop = model.getRowOffset(r);

      // 优化：如果完全在视图外则跳过（虽然索引计算应该已经处理了大部分情况）
      if (rowTop + rowHeight < scrollY || rowTop > scrollY + viewportHeight) {
        continue;
      }

      for (let c = startCol; c <= endCol; c++) {
        if (c >= config.colCount) {
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

        const isEditing = editingCell && editingCell.row === r && editingCell.col === c;
        const style = cellData?.style || {};

        // 确保 style.color 有默认值
        const textColor = style.color || theme.text.primary;

        if (isEditing) {
          cells.push(
            <Positioned
              key={`cell-edit-${r}-${c}`}
              left={colLeft}
              top={rowTop}
              width={displayWidth}
              height={displayHeight}
            >
              <EditableText
                value={cellData?.value || ''}
                width={displayWidth}
                height={displayHeight}
                fontSize={14}
                color={textColor}
                autoFocus={true}
                onFinish={onEditFinish}
                onCancel={onEditCancel}
              />
            </Positioned>,
          );
        } else {
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
                onPointerDown={(e) => {
                  console.log(`[SpreadsheetGrid] Cell down: ${r}, ${c}`, e.target);
                  onCellDown(r, c, e);
                }}
                onDblClick={() => {
                  console.log('[SpreadsheetGrid] Cell double click:', r, c);
                  onCellDoubleClick(r, c);
                }}
              >
                <Text
                  text={cellData?.value || ''}
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
        <Positioned key="selection-border" left={x} top={y} width={w} height={h}>
          <Container
            color="transparent"
            border={{ width: 2, color: theme.primary }}
            pointerEvent="none"
          />
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
