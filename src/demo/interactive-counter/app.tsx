/** @jsxImportSource @/utils/compiler */
import { ClassButton } from './widgets/class-button';
import { FunctionalButton } from './widgets/functional-button';
import { PerformanceMonitor } from './widgets/performance-monitor';
import { RawButton } from './widgets/raw-button';

import {
  Column,
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  MainAxisSize,
  Padding,
  Row,
  ScrollView,
  StatefulWidget,
  Text,
  type WidgetProps,
} from '@/core';
import { applyAlpha } from '@/core/helper/color';
import Runtime from '@/runtime';
import { Themes, type ThemePalette } from '@/styles/theme';

export interface InteractiveCounterDemoProps extends WidgetProps {
  theme?: ThemePalette;
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
    // 确保 theme 及其必要的子属性存在，防止传入部分 theme 或空对象导致崩溃
    const rawTheme = this.props.theme || Themes.light;
    const theme = rawTheme.text ? rawTheme : Themes.light;
    const width = this.props.width as number | undefined;
    const height = this.props.height as number | undefined;
    const scrollBarTrackColor = applyAlpha(theme.text.primary, 0.06);
    const scrollBarColor = applyAlpha(theme.text.primary, 0.22);
    const scrollBarHoverColor = applyAlpha(theme.text.primary, 0.32);
    const scrollBarActiveColor = applyAlpha(theme.text.primary, 0.44);

    return (
      <ScrollView
        key="interactive-counter-scroll"
        width={width}
        height={height}
        scrollBarTrackColor={scrollBarTrackColor}
        scrollBarColor={scrollBarColor}
        scrollBarHoverColor={scrollBarHoverColor}
        scrollBarActiveColor={scrollBarActiveColor}
      >
        <Container
          minWidth={width}
          minHeight={height}
          alignment="center"
          color={theme.background.base}
        >
          <Padding padding={32}>
            <Column
              spacing={32}
              crossAxisAlignment={CrossAxisAlignment.Center}
              mainAxisAlignment={MainAxisAlignment.Start}
              mainAxisSize={MainAxisSize.Min}
            >
              <Column key="header" spacing={8} mainAxisSize={MainAxisSize.Min}>
                <Text
                  key="title"
                  text="交互计数器"
                  fontSize={32}
                  fontWeight="bold"
                  color={theme.text.primary}
                />
                <Text
                  key="subtitle"
                  text="验证 State 化，通过三种方式（StateWidget，FunctionWidget、BaseWidget）实现"
                  fontSize={16}
                  color={theme.text.secondary}
                />
              </Column>

              <Row spacing={24} mainAxisSize={MainAxisSize.Min}>
                <Column
                  key="root-column"
                  spacing={24}
                  mainAxisSize={MainAxisSize.Min}
                  mainAxisAlignment={MainAxisAlignment.Center}
                >
                  <ClassButton key="class-btn" onClick={this.onInc} theme={theme}>
                    <Text key="btn-text-class" text=" Btn" fontSize={16} color="#ffffff" />
                  </ClassButton>

                  <FunctionalButton onClick={this.onInc} theme={theme} />

                  <RawButton key="raw-btn" onClick={this.onInc} theme={theme} />
                </Column>

                <Column spacing={24} mainAxisSize={MainAxisSize.Min}>
                  <PerformanceMonitor
                    key="perf-monitor"
                    ref={(r: unknown) => (this.monitorRef = r as PerformanceMonitor)}
                    externalCount={this.state.count}
                    theme={theme}
                  />

                  <Text
                    key="counter-display"
                    text={`Total Clicks: ${this.state.count}`}
                    fontSize={20}
                    color={theme.text.primary}
                    fontWeight="bold"
                  />
                </Column>
              </Row>
            </Column>
          </Padding>
        </Container>
      </ScrollView>
    );
  }
}

export function runApp(runtime: Runtime, width: number, height: number, theme: ThemePalette) {
  runtime.render(<InteractiveCounterDemo width={width} height={height} theme={theme} />);
}
