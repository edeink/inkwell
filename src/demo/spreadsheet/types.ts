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
  rowCount: number;
  colCount: number;
  defaultRowHeight: number;
  defaultColWidth: number;
  headerHeight: number;
  headerWidth: number;
}

export const DEFAULT_CONFIG: SheetConfig = {
  rowCount: 100000, // 百万级行
  colCount: 26 * 10, // 260 列
  defaultRowHeight: 24,
  defaultColWidth: 100,
  headerHeight: 24,
  headerWidth: 40,
};
