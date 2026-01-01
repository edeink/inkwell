/** @jsxImportSource @/utils/compiler */
// @ts-nocheck
import { easeSharp } from './easing';

import {
  Center,
  ClipRect,
  Container,
  MainAxisAlignment,
  Positioned,
  Row,
  Stack,
  StatefulWidget,
  Text,
  type InkwellEvent,
  type Widget,
  type WidgetProps,
} from '@/core';

export interface SwiperProps extends WidgetProps {
  items: Widget[];
  width: number;
  height: number;
  autoplay?: boolean;
  interval?: number; // 默认 3000ms
  duration?: number; // 默认 300ms
}

interface SwiperState {
  currentIndex: number;
  offset: number;
  dragging: boolean;
  width: number;
  pendingPrevIndex?: number;
  pendingNextIndex?: number;
}

export class Swiper extends StatefulWidget<SwiperProps, SwiperState> {
  private startX: number = 0;
  private animationFrameId: number | null = null;
  private autoplayTimer: ReturnType<typeof setInterval> | null = null;
  private isHovering: boolean = false;

  constructor(props: SwiperProps) {
    super(props);
    this.state = {
      currentIndex: 0,
      offset: 0,
      dragging: false,
      width: props.width || 0,
    };
    this.initAutoplay();
  }

  createElement(props: SwiperProps): Widget {
    super.createElement(props);
    // 更新宽高，以防 props 变化
    if (props.width !== this.state.width) {
      // 注意：这里直接修改 state 可能不会触发更新，但在 createElement 阶段是安全的
      this.state.width = props.width;
    }
    this.initAutoplay();
    return this;
  }

  private initAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }

    if (this.props.autoplay) {
      const interval = this.props.interval || 3000;
      this.autoplayTimer = setInterval(() => {
        if (!this.state.dragging && !this.isHovering) {
          this.next();
        }
      }, interval);
    }
  }

  private next() {
    const { items } = this.props;
    if (!items || items.length <= 1) {
      return;
    }
    this.animateTo(-this.state.width, () => {
      let nextIndex = this.state.currentIndex + 1;
      if (nextIndex >= items.length) {
        nextIndex = 0;
      }
      this.setState({ currentIndex: nextIndex, offset: 0 });
    });
  }

  private prev() {
    const { items } = this.props;
    if (!items || items.length <= 1) {
      return;
    }
    this.animateTo(this.state.width, () => {
      let prevIndex = this.state.currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = items.length - 1;
      }
      this.setState({ currentIndex: prevIndex, offset: 0 });
    });
  }

  // 动画核心逻辑
  private animateTo(targetOffset: number, onComplete: () => void) {
    const startOffset = this.state.offset;
    const startTime = Date.now();
    const duration = this.props.duration || 400; // 调整为 400ms 符合 300-500ms 要求

    const loop = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeSharp(progress);

      const currentOffset = startOffset + (targetOffset - startOffset) * eased;

      this.setState({ offset: currentOffset });

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(loop);
      } else {
        onComplete();
      }
    };

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(loop);
  }

  // 手势处理
  private handlePointerDown(e: InkwellEvent) {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.startX = e.x;
    const width = e.currentTarget.renderObject.size.width;

    this.setState({
      dragging: true,
      width: width,
      offset: 0,
    });
  }

  private handlePointerMove(e: InkwellEvent) {
    if (!this.state.dragging) {
      return;
    }
    const dx = e.x - this.startX;
    this.setState({ offset: dx });
  }

  private handlePointerUp(e: InkwellEvent) {
    if (!this.state.dragging) {
      return;
    }
    const dx = e.x - this.startX;
    const width = this.state.width;
    const threshold = width * 0.3;

    this.setState({ dragging: false });

    if (dx < -threshold) {
      // 向左滑，下一张
      this.animateTo(-width, () => {
        const { items } = this.props;
        let nextIndex = this.state.currentIndex + 1;
        if (nextIndex >= items.length) {
          nextIndex = 0;
        }
        this.setState({ currentIndex: nextIndex, offset: 0 });
      });
    } else if (dx > threshold) {
      // 向右滑，上一张
      this.animateTo(width, () => {
        const { items } = this.props;
        let prevIndex = this.state.currentIndex - 1;
        if (prevIndex < 0) {
          prevIndex = items.length - 1;
        }
        this.setState({ currentIndex: prevIndex, offset: 0 });
      });
    } else {
      // 回弹
      this.animateTo(0, () => {
        this.setState({ offset: 0 });
      });
    }
  }

  private handleIndicatorClick(index: number) {
    if (index === this.state.currentIndex) {
      return;
    }

    const { width } = this.state;
    // 根据目标索引位置决定滑动方向
    if (index > this.state.currentIndex) {
      // 目标在右侧，向左滑 (内容左移)
      this.setState({ pendingNextIndex: index });
      this.animateTo(-width, () => {
        this.setState({
          currentIndex: index,
          offset: 0,
          pendingNextIndex: undefined,
        });
      });
    } else {
      // 目标在左侧，向右滑 (内容右移)
      this.setState({ pendingPrevIndex: index });
      this.animateTo(width, () => {
        this.setState({
          currentIndex: index,
          offset: 0,
          pendingPrevIndex: undefined,
        });
      });
    }
  }

  render() {
    const { items, width, height } = this.props;
    const { currentIndex, offset } = this.state;

    if (!items || items.length === 0) {
      return (
        <Container width={width} height={height} color="#f0f0f0">
          <Center>
            <Text text="No Items" />
          </Center>
        </Container>
      );
    }

    const count = items.length;
    // 计算前、中、后索引
    // 优先使用 pendingIndex 用于动画过渡
    const prevIndex =
      this.state.pendingPrevIndex !== undefined
        ? this.state.pendingPrevIndex
        : (currentIndex - 1 + count) % count;

    const nextIndex =
      this.state.pendingNextIndex !== undefined
        ? this.state.pendingNextIndex
        : (currentIndex + 1) % count;

    const currentItem = items[currentIndex];
    const prevItem = items[prevIndex];
    const nextItem = items[nextIndex];

    return (
      <Container
        width={width}
        height={height}
        onPointerDown={this.handlePointerDown.bind(this)}
        onPointerMove={this.handlePointerMove.bind(this)}
        onPointerUp={this.handlePointerUp.bind(this)}
        onPointerEnter={() => (this.isHovering = true)}
        onPointerLeave={() => (this.isHovering = false)}
        // cursor="grab"
      >
        <ClipRect>
          <Stack>
            {/* 只有当有多个 item 时才渲染 prev/next */}
            {count > 1 ? (
              <Positioned left={-width + offset} top={0} width={width} height={height}>
                {prevItem}
              </Positioned>
            ) : null}
            {count > 1 ? (
              <Positioned left={width + offset} top={0} width={width} height={height}>
                {nextItem}
              </Positioned>
            ) : null}

            <Positioned left={offset} top={0} width={width} height={height}>
              {currentItem}
            </Positioned>

            {/* 指示器 */}
            <Positioned bottom={10} width={width} height={30}>
              <Center>
                <Row mainAxisAlignment={MainAxisAlignment.Center}>
                  {items.map((_, i) => (
                    <Container
                      key={`indicator-${i}`}
                      width={i === currentIndex ? 20 : 8}
                      height={8}
                      borderRadius={4}
                      color={i === currentIndex ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                      margin={{ left: 2, right: 4 }}
                      onClick={() => this.handleIndicatorClick(i)}
                      cursor="pointer"
                    />
                  ))}
                </Row>
              </Center>
            </Positioned>

            {/* 数字指示器 */}
            <Positioned top={10} right={10}>
              <Container
                color="rgba(0,0,0,0.5)"
                borderRadius={12}
                padding={{ left: 8, right: 8, top: 4, bottom: 4 }}
              >
                <Text text={`${currentIndex + 1} / ${count}`} color="#fff" fontSize={12} />
              </Container>
            </Positioned>
          </Stack>
        </ClipRect>
      </Container>
    );
  }
}
