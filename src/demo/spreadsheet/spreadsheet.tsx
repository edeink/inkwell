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
  selections: SelectionRange[];
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
  private _isSelecting: boolean = false;
  // 当前正在操作的选区的锚点（开始选择的位置）
  private _anchor: CellPosition | null = null;
  // 当前活动单元格（光标位置）
  private _cursor: CellPosition | null = null;

  constructor(props: SpreadsheetProps) {
    super(props);
    this.model = props.model || new SpreadsheetModel();

    this.darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    this.state = {
      scrollX: 0,
      scrollY: 0,
      selections: [],
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

  private dispatchSelectionChange(selections: SelectionRange[]) {
    const event = new CustomEvent('spreadsheet-selection-change', {
      detail: {
        selections,
      },
    });
    window.dispatchEvent(event);
  }

  private handleRowHeaderClick = (rowIndex: number, e: InkwellEvent) => {
    const selections = [
      {
        startRow: rowIndex,
        endRow: rowIndex,
        startCol: 0,
        endCol: this.model.getColCount() - 1,
      },
    ];
    this.dispatchSelectionChange(selections);
    // 选中整行
    this.setState({
      selections,
      editingCell: null,
    });
  };

  private handleColHeaderClick = (colIndex: number, e: InkwellEvent) => {
    const selections = [
      {
        startRow: 0,
        endRow: this.model.getRowCount() - 1,
        startCol: colIndex,
        endCol: colIndex,
      },
    ];
    this.dispatchSelectionChange(selections);
    // 选中整列
    this.setState({
      selections,
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
      // 单元格编辑器会自行处理输入；如需扩展，可在此处捕获 Enter 等按键。
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
    if (this.state.selections.length > 0) {
      const activeSelection = this.state.selections[this.state.selections.length - 1];
      // 优先使用 _cursor，如果为空则降级到 selection.start
      const currentRow = this._cursor?.row ?? activeSelection.startRow;
      const currentCol = this._cursor?.col ?? activeSelection.startCol;

      // 如果 _anchor 为空，初始化为当前位置
      if (!this._anchor) {
        this._anchor = { row: currentRow, col: currentCol };
      }

      let newRow = currentRow;
      let newCol = currentCol;

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

      if (newRow !== currentRow || newCol !== currentCol) {
        e.preventDefault();

        // 更新光标位置
        this._cursor = { row: newRow, col: newCol };

        let newSelections = this.state.selections;

        if (e.shiftKey) {
          // Shift 扩展模式
          // 保持锚点不变，更新当前选区（假设是最后一个）的范围
          const newSelection = {
            startRow: this._anchor.row,
            startCol: this._anchor.col,
            endRow: newRow,
            endCol: newCol,
          };

          // 如果列表为空，就只放这一个；否则替换最后一个
          if (newSelections.length === 0) {
            newSelections = [newSelection];
          } else {
            newSelections = [...newSelections.slice(0, -1), newSelection];
          }
        } else {
          // 普通移动模式
          // 锚点跟随光标
          this._anchor = { row: newRow, col: newCol };

          const newSelection = {
            startRow: newRow,
            startCol: newCol,
            endRow: newRow,
            endCol: newCol,
          };
          newSelections = [newSelection];
        }

        this.dispatchSelectionChange(newSelections);
        this.setState({
          selections: newSelections,
        });
        this.scrollToCell(newRow, newCol);
      }
    }
  };

  private async handleCopy(e: KeyboardEvent) {
    if (this.state.selections.length === 0) {
      return;
    }
    e.preventDefault();
    const activeSelection = this.state.selections[this.state.selections.length - 1];
    const { startRow, startCol, endRow, endCol } = activeSelection;
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
    if (this.state.selections.length === 0) {
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        return;
      }

      const rows = text.split(/\r\n|\n|\r/);
      const activeSelection = this.state.selections[this.state.selections.length - 1];
      const { startRow, startCol } = activeSelection;

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

      const newSelection = {
        startRow,
        startCol,
        endRow: maxR,
        endCol: maxC,
      };

      this.setState({
        version: this.state.version + 1,
        selections: [newSelection],
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

  private handleWindowPointerUp = () => {
    if (this._isSelecting) {
      this._isSelecting = false;
      // 保持 _anchor 和 _cursor 状态以便键盘操作继续
      window.removeEventListener('pointerup', this.handleWindowPointerUp);
    }
  };

  private handleCellDown = (row: number, col: number, e: InkwellEvent) => {
    this._isSelecting = true;
    window.addEventListener('pointerup', this.handleWindowPointerUp);

    let newSelections: SelectionRange[] = [];

    // Ctrl/Meta 键用于添加选区
    const isMultiSelect = e.metaKey || e.ctrlKey;
    // Shift 键用于扩展上一个选区
    const isExtendSelect = e.shiftKey;

    if (isExtendSelect && this.state.selections.length > 0) {
      // 扩展选择：保持锚点不变，更新光标
      if (!this._anchor) {
        // 如果没有锚点（比如初始状态），使用当前选区的起始点作为锚点
        const last = this.state.selections[this.state.selections.length - 1];
        this._anchor = { row: last.startRow, col: last.startCol };
      }
      this._cursor = { row, col };

      const newSelection = {
        startRow: this._anchor.row,
        startCol: this._anchor.col,
        endRow: row,
        endCol: col,
      };

      newSelections = [...this.state.selections.slice(0, -1), newSelection];
    } else if (isMultiSelect) {
      // 添加新选区：锚点和光标都设为新位置
      this._anchor = { row, col };
      this._cursor = { row, col };

      const newSelection = {
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
      };
      newSelections = [...this.state.selections, newSelection];
    } else {
      // 普通点击：重置为单一选区
      this._anchor = { row, col };
      this._cursor = { row, col };

      const newSelection = {
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
      };
      newSelections = [newSelection];
    }

    this.dispatchSelectionChange(newSelections);
    this.setState({
      selections: newSelections,
      editingCell: null,
    });
  };

  private handleCellHover = (row: number, col: number) => {
    // 避免重复更新：如果光标位置没有改变，则忽略
    if (this._cursor && this._cursor.row === row && this._cursor.col === col) {
      return;
    }

    if (this._isSelecting && this._anchor) {
      // 拖拽选择：更新光标位置，扩展当前选区
      this._cursor = { row, col };

      const currentSelections = this.state.selections;
      if (currentSelections.length === 0) {
        return;
      }

      const newSelection = {
        startRow: this._anchor.row,
        startCol: this._anchor.col,
        endRow: row,
        endCol: col,
      };

      const newSelections = [...currentSelections.slice(0, -1), newSelection];

      this.dispatchSelectionChange(newSelections);
      this.setState({
        selections: newSelections,
      });
    }
  };

  private handleCellDoubleClick = (row: number, col: number) => {
    const selections = [
      {
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
      },
    ];
    this.dispatchSelectionChange(selections);
    this.setState({
      editingCell: { row, col },
      selections,
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
    const { scrollX, scrollY, selections, editingCell, resizing } = this.state;

    const viewportWidth = width - config.headerWidth;
    const viewportHeight = height - config.headerHeight;

    // 始终渲染编辑器，通过 visible 控制可见性
    const { row, col } = editingCell || { row: 0, col: 0 };
    const cell = this.model.getCell(row, col);
    const cellLeft = this.model.getColOffset(col);
    const cellTop = this.model.getRowOffset(row);
    const cellWidth = this.model.getColWidth(col);
    const cellHeight = this.model.getRowHeight(row);
    const style = cell?.style || {};

    // 计算绝对位置
    const x = config.headerWidth + cellLeft - scrollX;
    const y = config.headerHeight + cellTop - scrollY;

    // 如果处于非编辑态，我们可以将位置设置为 0 或者保持上次的位置
    // 但为了逻辑简单，我们始终计算位置。如果 editingCell 为空，row/col 为 0/0，计算出来的位置也是有效的（虽然不可见）
    // 关键是传递 visible={!!editingCell}

    const editor = (
      <SpreadsheetEditableText
        key="spreadsheet-editor"
        x={x}
        y={y}
        minWidth={cellWidth}
        minHeight={cellHeight}
        maxWidth={Math.max(cellWidth, width - x)} // 确保至少有单元格宽度，但也限制在视口内
        maxHeight={Math.max(cellHeight, height - y)}
        value={cell?.value || ''}
        theme={theme}
        fontSize={14}
        color={style.color || theme.text.primary}
        onFinish={(value) => this.handleEditFinish(row, col, value)}
        onCancel={() => this.setState({ editingCell: null })}
        visible={!!editingCell}
      />
    );

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
                gridLineColor={this.props.gridLineColor ?? theme.component.gridLine}
                model={this.model}
                dataVersion={this.props.dataVersion}
                modelHash={this.model.hash}
                theme={theme}
                scrollX={scrollX}
                scrollY={scrollY}
                viewportWidth={viewportWidth}
                viewportHeight={viewportHeight}
                selections={selections}
                onCellDown={this.handleCellDown}
                onCellDoubleClick={this.handleCellDoubleClick}
                onCellHover={this.handleCellHover}
              />
            </ScrollView>
          </Positioned>

          {/* 2. 列头 (Column Headers) */}
          <Positioned
            left={config.headerWidth}
            top={0}
            width={viewportWidth}
            height={config.headerHeight}
          >
            <Container width={viewportWidth} height={config.headerHeight} overflow="hidden">
              <ColumnHeaders
                model={this.model}
                theme={theme}
                scrollX={scrollX}
                viewportWidth={viewportWidth}
                selections={selections}
                onResizeStart={(index, e) => this.handleResizeStart('col', index, e)}
                onHeaderClick={this.handleColHeaderClick}
              />
            </Container>
          </Positioned>

          {/* 3. 行头 (Row Headers) */}
          <Positioned
            left={0}
            top={config.headerHeight}
            width={config.headerWidth}
            height={viewportHeight}
          >
            <Container width={config.headerWidth} height={viewportHeight} overflow="hidden">
              <RowHeaders
                model={this.model}
                theme={theme}
                scrollY={scrollY}
                viewportHeight={viewportHeight}
                selections={selections}
                onResizeStart={(index, e) => this.handleResizeStart('row', index, e)}
                onHeaderClick={this.handleRowHeaderClick}
              />
            </Container>
          </Positioned>

          {/* 4. 左上角角落 */}
          <Positioned left={0} top={0} width={config.headerWidth} height={config.headerHeight}>
            <CornerHeader width={config.headerWidth} height={config.headerHeight} theme={theme} />
          </Positioned>

          {/* 5. 编辑器 (绝对定位在最上层) */}
          {editor}
        </Stack>
      </Container>
    );
  }
}
