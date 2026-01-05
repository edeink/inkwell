/** @jsxImportSource @/utils/compiler */
import { Spreadsheet } from './spreadsheet';
import { SpreadsheetModel } from './spreadsheet-model';
import { DEFAULT_CONFIG } from './types';

import type { WidgetProps } from '@/core/base';
import type Runtime from '@/runtime';

import { Container } from '@/core';
import { StatefulWidget } from '@/core/state/stateful';
import { Themes, type ThemePalette } from '@/styles/theme';

export interface SpreadsheetDemoAppProps extends WidgetProps {
  width?: number;
  height?: number;
  theme?: ThemePalette;
  /**
   * 外部传入的数据模型。如果不传，组件将自行创建并初始化演示数据。
   */
  model?: SpreadsheetModel;
  /**
   * 外部数据版本号。如果不传，组件将使用内部状态管理版本。
   */
  dataVersion?: number;
}

// 用于 React 宿主环境 (index.tsx) 和 MDX 文档演示
export class SpreadsheetDemoApp extends StatefulWidget<SpreadsheetDemoAppProps> {
  private _internalModel?: SpreadsheetModel;

  state = {
    dataVersion: 0,
  };

  constructor(props: SpreadsheetDemoAppProps) {
    super(props);
    // 如果没有传入 model，则初始化内部 model (用于 MDX 演示)
    if (!props.model) {
      this._internalModel = new SpreadsheetModel({
        ...DEFAULT_CONFIG,
        rowCount: 100,
        colCount: 26,
      });
      this.initData(this._internalModel);
    }
  }

  get model(): SpreadsheetModel {
    return this.props.model || this._internalModel!;
  }

  get currentDataVersion(): number {
    return this.props.dataVersion !== undefined ? this.props.dataVersion : this.state.dataVersion;
  }

  initData(model: SpreadsheetModel) {
    model.setCell(0, 0, { value: 'Item' });
    model.setCell(0, 1, { value: 'Cost' });
    model.setCell(0, 2, { value: 'Price' });
    model.setCell(1, 0, { value: 'Apple' });
    model.setCell(1, 1, { value: '1.50' });
    model.setCell(1, 2, { value: '3.00' });
    model.setCell(2, 0, { value: 'Banana' });
    model.setCell(2, 1, { value: '0.50' });
    model.setCell(2, 2, { value: '1.00' });
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
          dataVersion={this.currentDataVersion}
        />
      </Container>
    );
  }
}

// 辅助函数：用于 React 宿主环境 (index.tsx)
export function runApp(
  runtime: Runtime,
  width: number,
  height: number,
  theme: ThemePalette,
  model: SpreadsheetModel,
  dataVersion: number,
) {
  runtime.render(
    <SpreadsheetDemoApp
      key="spreadsheet-demo-app"
      width={width}
      height={height}
      theme={theme}
      model={model}
      dataVersion={dataVersion}
    />,
  );
}
