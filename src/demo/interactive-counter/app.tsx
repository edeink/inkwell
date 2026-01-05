/** @jsxImportSource @/utils/compiler */
import { ClassButton } from './widgets/class-button';
import { FunctionalButton } from './widgets/functional-button';
import { PerformanceMonitor } from './widgets/performance-monitor';
import { RawButton } from './widgets/raw-button';

import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  MainAxisAlignment,
  MainAxisSize,
  Padding,
  Row,
  StatefulWidget,
  Text,
  type WidgetProps,
} from '@/core';
import Runtime from '@/runtime';

export interface InteractiveCounterDemoProps extends WidgetProps {
  theme: ThemePalette;
}

export interface InteractiveCounterDemoState {
  count: number;
  [key: string]: unknown;
}

/**
 * 交互式计数器示例
 *
 * 展示了：
 * 1. 不同类型的组件实现 (Class, Functional, Raw)
 * 2. 状态管理与 Ref 通信
 * 3. 性能监控与渲染优化
 */
export class InteractiveCounterDemo extends StatefulWidget<
  InteractiveCounterDemoProps,
  InteractiveCounterDemoState
> {
  private monitorRef: PerformanceMonitor | null = null;

  state: InteractiveCounterDemoState = {
    count: 0,
  };

  /**
   * 统一的点击处理函数
   */
  private onInc = (): void => {
    // 更新自身状态
    this.setState({ count: this.state.count + 1 });

    // 性能监控器闪烁
    if (this.monitorRef) {
      this.monitorRef.flash();
    }
  };

  render() {
    const { theme } = this.props;

    return (
      <Padding padding={24}>
        <Row spacing={24}>
          <Column
            key="root-column"
            spacing={24}
            mainAxisSize={MainAxisSize.Min}
            mainAxisAlignment={MainAxisAlignment.Center}
          >
            {/* 方案 A: Class Component */}
            <ClassButton onClick={this.onInc} theme={theme}>
              <Text key="btn-text-class" text=" Btn" fontSize={16} color="#ffffff" />
            </ClassButton>

            {/* 方案 B: Functional Component */}
            <FunctionalButton onClick={this.onInc} theme={theme} />

            {/* 方案 C: Raw Widget (Custom Paint) */}
            <RawButton key="raw-btn" onClick={this.onInc} theme={theme} />
          </Column>

          <Column spacing={24}>
            {/* 1. 性能监控区 */}
            <PerformanceMonitor
              key="perf-monitor"
              ref={(r: unknown) => (this.monitorRef = r as PerformanceMonitor)}
              externalCount={this.state.count}
              theme={theme}
            />

            {/* 3. 状态展示区 */}
            <Text
              key={`counter-display-${this.state.count}`}
              text={`Total Clicks: ${this.state.count}`}
              fontSize={20}
              color={theme.text.primary}
              fontWeight="bold"
            />
          </Column>
        </Row>
      </Padding>
    );
  }
}

export function runApp(runtime: Runtime, theme: ThemePalette) {
  runtime.render(<InteractiveCounterDemo theme={theme} />);
}
