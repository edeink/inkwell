/** @jsxImportSource @/utils/compiler */
import { Spreadsheet } from './spreadsheet';
import { SpreadsheetModel } from './spreadsheet-model';
import { DEFAULT_CONFIG } from './types';

import type { WidgetProps } from '@/core/base';
import type Runtime from '@/runtime';

import { Container, StatelessWidget } from '@/core';
import { StatefulWidget } from '@/core/state/stateful';
import { Themes, type ThemePalette } from '@/styles/theme';

// 用于 React 宿主环境 (index.tsx)，状态由 React 管理
export function runApp(
  runtime: Runtime,
  width: number,
  height: number,
  theme: ThemePalette,
  model: SpreadsheetModel,
  dataVersion: number,
) {
  runtime.render(
    <SpreadsheetViewer
      width={width}
      height={height}
      theme={theme}
      model={model}
      dataVersion={dataVersion}
    />,
  );
}

interface SpreadsheetViewerProps extends WidgetProps {
  width: number;
  height: number;
  theme: ThemePalette;
  model: SpreadsheetModel;
  dataVersion: number;
}

class SpreadsheetViewer extends StatelessWidget<SpreadsheetViewerProps> {
  render() {
    const { width, height, theme, model, dataVersion } = this.props;

    return (
      <Container width={width} height={height} color={theme.background.base}>
        <Spreadsheet
          width={width}
          height={height}
          model={model}
          theme={theme}
          dataVersion={dataVersion}
        />
      </Container>
    );
  }
}

// 用于 MDX 文档演示，状态自管理
interface SpreadsheetDemoAppProps extends WidgetProps {
  width?: number;
  height?: number;
  theme?: ThemePalette;
}

export class SpreadsheetDemoApp extends StatefulWidget<SpreadsheetDemoAppProps> {
  model: SpreadsheetModel;
  state = {
    dataVersion: 0,
  };

  constructor(props: SpreadsheetDemoAppProps) {
    super(props);
    this.model = new SpreadsheetModel({
      ...DEFAULT_CONFIG,
      rowCount: 100,
      colCount: 26,
    });
    this.initData();
  }

  initData() {
    this.model.setCell(0, 0, { value: 'Item' });
    this.model.setCell(0, 1, { value: 'Cost' });
    this.model.setCell(0, 2, { value: 'Price' });
    this.model.setCell(1, 0, { value: 'Apple' });
    this.model.setCell(1, 1, { value: '1.50' });
    this.model.setCell(1, 2, { value: '3.00' });
    this.model.setCell(2, 0, { value: 'Banana' });
    this.model.setCell(2, 1, { value: '0.50' });
    this.model.setCell(2, 2, { value: '1.00' });
  }

  render() {
    const { width = 600, height = 400, theme = Themes.light } = this.props;

    return (
      <Container width={width} height={height} color={theme.background.base}>
        <Spreadsheet
          width={width}
          height={height}
          model={this.model}
          theme={theme}
          dataVersion={this.state.dataVersion}
        />
      </Container>
    );
  }
}
