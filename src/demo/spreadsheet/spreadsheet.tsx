/** @jsxImportSource @/utils/compiler */

import { SpreadsheetModel } from './spreadsheet-model';
import { ColumnHeaders } from './widgets/col-header';
import { CornerHeader } from './widgets/corner';
import { SpreadsheetEditableText } from './widgets/editable-text';
import { SpreadsheetGrid } from './widgets/grid';
import { RowHeaders } from './widgets/row-header';

import type { CellPosition, SelectionRange } from './types';
import type { WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events/types';
import type { ThemePalette } from '@/styles/theme';

import { Container, Positioned, Stack } from '@/core';
import { isEditableElement } from '@/core/events/helper';
import { StatefulWidget } from '@/core/state/stateful';
import { ScrollView } from '@/core/viewport/scroll-view';

interface ResizingState {
  type: 'row' | 'col';
  index: number;
  startPos: number;
  startSize: number;
}

export interface SpreadsheetProps extends WidgetProps {
  width: number;
  height: number;
  theme: ThemePalette;
  model?: SpreadsheetModel;
  /**
   * 是否显示网格线
   * @default true
   */
  showGridLines?: boolean;
  /**
   * 网格线颜色
   * @default '#E5E5E5'
   */
  gridLineColor?: string;
  /**
   * 外部数据版本号，用于触发重绘
   */
  dataVersion?: number;
  [key: string]: unknown;
}

interface SpreadsheetState {
  scrollX: number;
  scrollY: number;
  selection: SelectionRange | null;
  editingCell: CellPosition | null;
  resizing: ResizingState | null;
  // 用于强制更新
  version: number;
  isDarkMode: boolean;
  [key: string]: unknown;
}

export class Spreadsheet extends StatefulWidget<SpreadsheetProps, SpreadsheetState> {
  model: SpreadsheetModel;
  private darkModeQuery: MediaQueryList;

  constructor(props: SpreadsheetProps) {
    super(props);
    this.model = props.model || new SpreadsheetModel();

    this.darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    this.state = {
      scrollX: 0,
      scrollY: 0,
      selection: null,
      editingCell: null,
      resizing: null,
      version: 0,
      isDarkMode: this.darkModeQuery.matches,
    };

    this.darkModeQuery.addEventListener('change', this.handleThemeChange);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleThemeChange = (e: MediaQueryListEvent) => {
    this.setState({ isDarkMode: e.matches });
  };

  private dispatchSelectionChange(newSelection: SelectionRange) {
    const event = new CustomEvent('spreadsheet-selection-change', {
      detail: newSelection,
    });
    window.dispatchEvent(event);
  }

  private handleRowHeaderClick = (rowIndex: number, e: InkwellEvent) => {
    const selection = {
      startRow: rowIndex,
      endRow: rowIndex,
      startCol: 0,
      endCol: this.model.getColCount() - 1,
    };
    this.dispatchSelectionChange(selection);
    // 选中整行
    this.setState({
      selection,
      editingCell: null,
    });
  };

  private handleColHeaderClick = (colIndex: number, e: InkwellEvent) => {
    const selection = {
      startRow: 0,
      endRow: this.model.getRowCount() - 1,
      startCol: colIndex,
      endCol: colIndex,
    };
    this.dispatchSelectionChange(selection);
    // 选中整列
    this.setState({
      selection,
      editingCell: null,
    });
  };

  dispose() {
    this.darkModeQuery.removeEventListener('change', this.handleThemeChange);
    window.removeEventListener('keydown', this.handleKeyDown);
    super.dispose();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // 如果焦点在可编辑元素上（如输入框），则不应拦截快捷键
    if (isEditableElement(e.target)) {
      return;
    }

    // 如果当前有原生 DOM 文本选区（且不是在 canvas 内），也不应拦截复制/粘贴
    // 这样用户可以复制页面上的普通文本
    const nativeSelection = window.getSelection();
    if (nativeSelection && !nativeSelection.isCollapsed && nativeSelection.toString().length > 0) {
      return;
    }

    if (this.state.editingCell) {
      // EditableText 处理自己的输入，但如果需要，我们可以通过在此处捕获 Enter 键。
      return;
    }

    // 复制/粘贴
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      this.handleCopy(e);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      this.handlePaste(e);
      return;
    }

    // 导航
    if (this.state.selection) {
      const { startRow, startCol } = this.state.selection;
      let newRow = startRow;
      let newCol = startCol;

      switch (e.key) {
        case 'ArrowUp':
          newRow--;
          break;
        case 'ArrowDown':
          newRow++;
          break;
        case 'ArrowLeft':
          newCol--;
          break;
        case 'ArrowRight':
          newCol++;
          break;
        default:
          return;
      }

      newRow = Math.max(0, Math.min(newRow, this.model.getRowCount() - 1));
      newCol = Math.max(0, Math.min(newCol, this.model.getColCount() - 1));

      if (newRow !== startRow || newCol !== startCol) {
        e.preventDefault();
        const selection = {
          startRow: newRow,
          startCol: newCol,
          endRow: newRow,
          endCol: newCol,
        };
        this.dispatchSelectionChange(selection);
        this.setState({
          selection,
        });
        this.scrollToCell(newRow, newCol);
      }
    }
  };

  private async handleCopy(e: KeyboardEvent) {
    if (!this.state.selection) {
      return;
    }
    e.preventDefault();
    const { startRow, startCol, endRow, endCol } = this.state.selection;
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    const minC = Math.min(startCol, endCol);
    const maxC = Math.max(startCol, endCol);

    const rows: string[] = [];
    for (let r = minR; r <= maxR; r++) {
      const cols: string[] = [];
      for (let c = minC; c <= maxC; c++) {
        const cell = this.model.getCell(r, c);
        cols.push(cell?.value || '');
      }
      rows.push(cols.join('\t'));
    }
    const text = rows.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Copy failed', err);
    }
  }

  private async handlePaste(e: KeyboardEvent) {
    if (!this.state.selection) {
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        return;
      }

      const rows = text.split(/\r\n|\n|\r/);
      const { startRow, startCol } = this.state.selection;

      let maxR = startRow;
      let maxC = startCol;

      rows.forEach((rowStr, rIdx) => {
        const cols = rowStr.split('\t');
        cols.forEach((val, cIdx) => {
          // 粘贴逻辑：简单覆盖
          const targetR = startRow + rIdx;
          const targetC = startCol + cIdx;

          // 检查边界或扩展
          const maxRows = this.model.config.rowCount;
          const maxCols = this.model.config.colCount;

          if (
            (maxRows === undefined || targetR < maxRows) &&
            (maxCols === undefined || targetC < maxCols)
          ) {
            const cell = this.model.getCell(targetR, targetC) || { value: '' };
            this.model.setCell(targetR, targetC, { ...cell, value: val });
            maxR = Math.max(maxR, targetR);
            maxC = Math.max(maxC, targetC);
          }
        });
      });

      this.setState({
        version: this.state.version + 1,
        selection: {
          startRow,
          startCol,
          endRow: maxR,
          endCol: maxC,
        },
      });
    } catch (err) {
      console.error('粘贴失败', err);
    }
  }

  private scrollToCell(row: number, col: number) {
    const { width, height } = this.props;
    const { config } = this.model;
    const viewportWidth = width - config.headerWidth;
    const viewportHeight = height - config.headerHeight;

    const cellTop = this.model.getRowOffset(row);
    const cellBottom = cellTop + this.model.getRowHeight(row);
    const cellLeft = this.model.getColOffset(col);
    const cellRight = cellLeft + this.model.getColWidth(col);

    let newScrollY = this.state.scrollY;
    let newScrollX = this.state.scrollX;

    if (cellTop < newScrollY) {
      newScrollY = cellTop;
    } else if (cellBottom > newScrollY + viewportHeight) {
      newScrollY = cellBottom - viewportHeight;
    }

    if (cellLeft < newScrollX) {
      newScrollX = cellLeft;
    } else if (cellRight > newScrollX + viewportWidth) {
      newScrollX = cellRight - viewportWidth;
    }

    if (newScrollX !== this.state.scrollX || newScrollY !== this.state.scrollY) {
      this.setState({
        scrollX: Math.max(0, newScrollX),
        scrollY: Math.max(0, newScrollY),
      });
    }
  }

  private handleScroll = (scrollX: number, scrollY: number) => {
    // 将 ScrollView 状态与我们的状态同步
    this.setState({ scrollX, scrollY });

    // 检查是否需要扩展视图（无限滚动）
    const { width, height } = this.props;
    const { config } = this.model;
    const viewportWidth = width - config.headerWidth;
    const viewportHeight = height - config.headerHeight;

    const bottomRow = this.model.getRowIndexAt(scrollY + viewportHeight);
    const rightCol = this.model.getColIndexAt(scrollX + viewportWidth);

    // 如果接近边界，请求扩展
    // ensureVisible 内部会检查 rowCount/colCount 是否为 undefined
    const changed = this.model.ensureVisible(bottomRow, rightCol);

    if (changed) {
      // 如果边界改变了，强制刷新以更新滚动区域大小
      this.setState({ version: this.state.version + 1 });
    }
  };

  private handleCellDown = (row: number, col: number, e: InkwellEvent) => {
    const selection = {
      startRow: row,
      startCol: col,
      endRow: row,
      endCol: col,
    };
    this.dispatchSelectionChange(selection);
    this.setState({
      selection,
      editingCell: null,
    });
  };

  private handleCellDoubleClick = (row: number, col: number) => {
    const selection = {
      startRow: row,
      startCol: col,
      endRow: row,
      endCol: col,
    };
    this.dispatchSelectionChange(selection);
    this.setState({
      editingCell: { row, col },
      selection,
    });
  };

  private handleEditFinish = (row: number, col: number, value: string) => {
    // 始终保存数据到对应的单元格 (使用闭包捕获的正确位置，避免竞态问题)
    const cell = this.model.getCell(row, col) || { value: '' };
    this.model.setCell(row, col, { ...cell, value });

    // 只有当当前编辑状态仍指向该单元格时，才清除编辑状态
    // 如果用户已经双击了其他单元格（导致 editingCell 改变），则不应清除新单元格的编辑状态
    if (
      this.state.editingCell &&
      this.state.editingCell.row === row &&
      this.state.editingCell.col === col
    ) {
      this.setState({ editingCell: null, version: this.state.version + 1 });
    } else {
      // 即使不清除编辑状态，也需要刷新视图以显示刚更新的数据
      this.setState({ version: this.state.version + 1 });
    }
  };

  private handleResizeStart = (type: 'row' | 'col', index: number, e: InkwellEvent) => {
    e.stopPropagation();
    const startPos = type === 'col' ? e.x : e.y;
    const startSize =
      type === 'col' ? this.model.getColWidth(index) : this.model.getRowHeight(index);
    this.setState({
      resizing: {
        type,
        index,
        startPos,
        startSize,
      },
    });
  };

  private handleResizeMove = (e: InkwellEvent) => {
    if (!this.state.resizing) {
      return;
    }
    e.stopPropagation();
    const { type, index, startPos, startSize } = this.state.resizing;
    const currentPos = type === 'col' ? e.x : e.y;
    const delta = currentPos - startPos;
    const newSize = Math.max(5, startSize + delta);

    if (type === 'col') {
      this.model.setColWidth(index, newSize);
    } else {
      this.model.setRowHeight(index, newSize);
    }
    // 强制更新
    this.setState({ version: this.state.version + 1 });
  };

  private handleResizeEnd = (e: InkwellEvent) => {
    if (this.state.resizing) {
      this.setState({ resizing: null });
    }
  };

  protected didUpdateWidget(oldProps: SpreadsheetProps): void {
    if (this.props.model && this.props.model !== oldProps.model) {
      this.model = this.props.model;
    }
    // 如果数据版本发生变化，强制重绘
    if (this.props.dataVersion !== oldProps.dataVersion) {
      this.markNeedsPaint();
    }
    super.didUpdateWidget(oldProps);
  }

  render() {
    const { width, height, theme } = this.props;
    const { config } = this.model;
    const { scrollX, scrollY, selection, editingCell, resizing } = this.state;

    const viewportWidth = width - config.headerWidth;
    const viewportHeight = height - config.headerHeight;

    let editor = null;
    if (editingCell) {
      const { row, col } = editingCell;
      const cell = this.model.getCell(row, col);
      const cellLeft = this.model.getColOffset(col);
      const cellTop = this.model.getRowOffset(row);
      const cellWidth = this.model.getColWidth(col);
      const cellHeight = this.model.getRowHeight(row);
      const style = cell?.style || {};

      // Calculate absolute position
      const x = config.headerWidth + cellLeft - scrollX;
      const y = config.headerHeight + cellTop - scrollY;

      editor = (
        <SpreadsheetEditableText
          key={`editor-${row}-${col}`}
          x={x}
          y={y}
          minWidth={cellWidth}
          minHeight={cellHeight}
          maxWidth={Math.max(cellWidth, width - x)} // Ensure at least cell width, but constraint to viewport
          maxHeight={Math.max(cellHeight, height - y)}
          value={cell?.value || ''}
          theme={theme}
          fontSize={14}
          color={style.color || theme.text.primary}
          onFinish={(value) => this.handleEditFinish(row, col, value)}
          onCancel={() => this.setState({ editingCell: null })}
        />
      );
    }

    return (
      <Container
        width={width}
        height={height}
        color={theme.background.base}
        onPointerMove={resizing ? this.handleResizeMove : undefined}
        onPointerUp={resizing ? this.handleResizeEnd : undefined}
      >
        <Stack>
          {/* 1. 主网格区域 (ScrollView) */}
          <Positioned
            left={config.headerWidth}
            top={config.headerHeight}
            width={viewportWidth}
            height={viewportHeight}
          >
            <ScrollView
              width={viewportWidth}
              height={viewportHeight}
              scrollX={scrollX}
              scrollY={scrollY}
              onScroll={this.handleScroll}
              overflow="hidden"
            >
              <SpreadsheetGrid
                showGridLines={this.props.showGridLines ?? true}
                gridLineColor={this.props.gridLineColor ?? theme.border.base}
                model={this.model}
                dataVersion={this.props.dataVersion}
                modelHash={this.model.hash}
                theme={theme}
                scrollX={scrollX}
                scrollY={scrollY}
                viewportWidth={viewportWidth}
                viewportHeight={viewportHeight}
                selection={selection}
                onCellDown={this.handleCellDown}
                onCellDoubleClick={this.handleCellDoubleClick}
              />
            </ScrollView>
          </Positioned>

          {/* 2. 列头 (固定在顶部) */}
          <Positioned
            left={config.headerWidth}
            top={0}
            width={viewportWidth}
            height={config.headerHeight}
          >
            <ColumnHeaders
              model={this.model}
              theme={theme}
              scrollX={scrollX}
              viewportWidth={viewportWidth}
              selection={selection}
              onResizeStart={(idx, e) => this.handleResizeStart('col', idx, e)}
              onHeaderClick={(colIndex, e) => this.handleColHeaderClick(colIndex, e)}
            />
          </Positioned>

          {/* 3. 行头 (固定在左侧) */}
          <Positioned
            left={0}
            top={config.headerHeight}
            width={config.headerWidth}
            height={viewportHeight}
          >
            <RowHeaders
              model={this.model}
              theme={theme}
              scrollY={scrollY}
              viewportHeight={viewportHeight}
              selection={selection}
              onResizeStart={(idx, e) => this.handleResizeStart('row', idx, e)}
              onHeaderClick={(rowIndex, e) => this.handleRowHeaderClick(rowIndex, e)}
            />
          </Positioned>

          {/* 4. 角落表头 */}
          <Positioned left={0} top={0} width={config.headerWidth} height={config.headerHeight}>
            <CornerHeader width={config.headerWidth} height={config.headerHeight} theme={theme} />
          </Positioned>

          {/* 5. 编辑器覆盖层 */}
          {editor}
        </Stack>
      </Container>
    );
  }
}
