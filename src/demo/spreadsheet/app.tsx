/** @jsxImportSource @/utils/compiler */
import { Spreadsheet } from './spreadsheet';
import { SpreadsheetModel } from './spreadsheet-model';
import { DEFAULT_CONFIG } from './types';

import type Runtime from '@/runtime';
import type { ThemePalette } from '@/styles/theme';

// 单例模型，保持数据持久化
const model = new SpreadsheetModel(DEFAULT_CONFIG);

export function runApp(runtime: Runtime, width: number, height: number, theme: ThemePalette) {
  runtime.render(<Spreadsheet width={width} height={height} model={model} theme={theme} />);
}
