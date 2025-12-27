/** @jsxImportSource @/utils/compiler */
import { Column, Container, StatefulWidget, Text, type WidgetProps } from '@/core';

export interface PerformanceMonitorProps extends WidgetProps {
  /** 外部传入的业务计数 */
  externalCount: number;
}

export interface PerformanceMonitorState {
  // 内部计数，用于记录触发次数
  innerCount: number;
  // 闪烁状态颜色
  indicatorColor: string;
  [key: string]: unknown;
}

/**
 * 性能监控组件
 * 展示渲染次数，并提供 Ref 方法供外部触发视觉反馈
 */
export class PerformanceMonitor extends StatefulWidget<
  PerformanceMonitorProps,
  PerformanceMonitorState
> {
  private renderCount: number = 0;

  state: PerformanceMonitorState = {
    innerCount: 0,
    indicatorColor: '#52c41a', // 初始绿色
  };

  /**
   * 供外部调用的 Ref 方法
   * 触发一次"闪烁"并增加渲染计数
   */
  public flash() {
    const colors = ['#ff4d4f', '#faad14', '#52c41a', '#1677ff'];
    const randomColor = colors[this.state.innerCount % colors.length];

    this.setState({
      innerCount: this.state.innerCount + 1,
      indicatorColor: randomColor,
    });
  }

  /**
   * 每次渲染都会调用
   */
  render() {
    // 增加渲染计数 (注意：直接修改 state 而不调用 setState 在 render 中是危险的，
    // 但这里我们只是为了统计 render 次数，为了避免死循环，我们不在这里调用 setState
    this.renderCount++;

    return (
      <Container
        key="perf-monitor-container"
        width={240}
        padding={{ top: 12, bottom: 12, left: 16, right: 16 }}
        color="#f5f5f5"
        borderRadius={8}
        border={{ width: 1, color: '#d9d9d9' }}
      >
        <Column spacing={20}>
          {/* 业务计数显示 */}
          <Text text={`外部计数: ${this.props.externalCount}`} fontSize={14} color="#333" />

          <Text text={`内部计数: ${this.state.innerCount}`} fontSize={14} color="#333" />

          {/* 渲染性能指示器 */}
          <Container width={16} height={16} borderRadius={8} color={this.state.indicatorColor} />

          <Text text={`render 调用次数: ${this.renderCount}`} fontSize={12} color="#666" />
        </Column>
      </Container>
    );
  }
}
