export interface CellData {
  value: string;
  style?: CellStyle;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface CellPosition {
  row: number;
  col: number;
}

export interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface SheetConfig {
  rowCount?: number;
  colCount?: number;
  defaultRowHeight: number;
  defaultColWidth: number;
  headerHeight: number;
  headerWidth: number;
}

export const DEFAULT_CONFIG: SheetConfig = {
  // 默认不设置行列数，启用无限滚动
  defaultRowHeight: 24,
  defaultColWidth: 100,
  headerHeight: 24,
  headerWidth: 40,
};
