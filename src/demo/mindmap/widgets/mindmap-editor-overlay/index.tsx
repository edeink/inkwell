/** @jsxImportSource @/utils/compiler */

import {
  maxNodeHeight,
  maxNodeWidth,
  minNodeWidth,
  nodeBorderRadius,
  nodePaddingHorizontal,
  nodePaddingVertical,
} from '../mindmap-node';

import type { WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { Container, Positioned, StatefulWidget, TextArea } from '@/core';
import { getCurrentThemeMode, Themes } from '@/styles/theme';

/**
 * 编辑器覆盖层在画布坐标系下的矩形信息。
 *
 * left/top 为左上角位置，width/height 为覆盖层尺寸。
 */
export type MindMapEditorRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * 全局编辑器覆盖层属性。
 *
 * - targetKey/rect 同时存在时进入编辑态
 * - value 为当前节点标题（受控）
 */
export type MindMapEditorOverlayProps = WidgetProps & {
  targetKey: string | null;
  rect: MindMapEditorRect | null;
  value: string;
  scale?: number;
  theme?: ThemePalette;
  onCommit: (value: string) => void;
  onCancel: () => void;
};

type MindMapEditorOverlayState = {
  text: string;
};

/**
 * 思维导图的全局编辑器覆盖层。
 *
 * 通过 TextArea 进行输入，并实时测量尺寸以与节点视觉尺寸保持一致。
 */
export class MindMapEditorOverlay extends StatefulWidget<
  MindMapEditorOverlayProps,
  MindMapEditorOverlayState
> {
  private textAreaRef: TextArea | null = null;
  private pendingFocus = false;
  /** 是否抑制由程序触发 blur 导致的关闭 */
  private suppressNextBlurClose = false;

  /**
   * 创建编辑器覆盖层。
   *
   * @param data 组件属性
   */
  constructor(data: MindMapEditorOverlayProps) {
    super(data);
    const active = !!data.targetKey && !!data.rect;
    this.state = {
      text: active ? data.value : '',
    };
    this.pendingFocus = active;
  }

  private getScale(scale: MindMapEditorOverlayProps['scale']): number {
    return typeof scale === 'number' && scale > 0 ? scale : 1;
  }

  private computeBoxFromRect(
    rect: MindMapEditorRect,
    scale: number,
  ): { width: number; height: number; contentWidth: number; contentHeight: number } {
    const width = Math.max(0, rect.width);
    const height = Math.max(0, rect.height);
    const contentWidth = Math.max(0, width - nodePaddingHorizontal * scale * 2);
    const contentHeight = Math.max(0, height - nodePaddingVertical * scale * 2);
    return { width, height, contentWidth, contentHeight };
  }

  /**
   * props 更新后同步内部受控文本与焦点行为。
   *
   * @param oldProps 旧属性
   * @returns void
   */
  protected didUpdateWidget(oldProps: MindMapEditorOverlayProps) {
    const prevActive = !!oldProps.targetKey && !!oldProps.rect;
    const nextActive = !!this.props.targetKey && !!this.props.rect;
    const keyChanged = this.props.targetKey !== oldProps.targetKey;

    if (prevActive !== nextActive && !nextActive) {
      this.setState({
        text: '',
      });
    }

    if (!prevActive && nextActive) {
      this.setState({
        text: this.props.value,
      });
      this.pendingFocus = true;
    }

    if (prevActive && nextActive && keyChanged) {
      this.setState({
        text: this.props.value,
      });
      this.pendingFocus = true;
    }

    if (
      prevActive &&
      nextActive &&
      !keyChanged &&
      oldProps.value !== this.props.value &&
      this.props.value !== this.state.text
    ) {
      this.setState({
        text: this.props.value,
      });
    }

    if (prevActive && !nextActive) {
      const domInput = (this.textAreaRef as unknown as { input?: HTMLTextAreaElement | null })
        .input;
      this.suppressNextBlurClose = true;
      domInput?.blur?.();
    }
  }

  /**
   * 渲染覆盖层：当 active=false 时保持不可见，避免影响事件派发。
   *
   * @returns JSX 元素
   */
  render() {
    const resolvedTheme = this.props.theme ?? Themes[getCurrentThemeMode()];
    const rect = this.props.rect;
    const active = !!this.props.targetKey && !!rect;

    const left = active ? rect!.left : 0;
    const top = active ? rect!.top : 0;
    const scale = this.getScale(this.props.scale);
    const box = active ? this.computeBoxFromRect(rect!, scale) : null;
    const width = active ? box!.width : 0;
    const height = active ? box!.height : 0;

    const baseFontSize = 14;

    const textColor = resolvedTheme.text.primary;
    const selectionColor = resolvedTheme.state.focus;
    const borderColor = resolvedTheme.primary;
    const borderWidth = active ? 2 * scale : 0;
    const fill = resolvedTheme.background.container;
    const padding: 0 | [number, number] = active
      ? [nodePaddingVertical * scale, nodePaddingHorizontal * scale]
      : 0;
    const border = active
      ? ({ color: borderColor, width: borderWidth, style: 'solid' } as const)
      : undefined;
    const borderRadius = active ? nodeBorderRadius * scale : 0;
    const minWidth = active ? minNodeWidth * scale : 0;
    const maxWidth = active ? maxNodeWidth * scale : 0;
    const maxHeight = active ? maxNodeHeight * scale : 0;
    const contentW = active ? box!.contentWidth : 0;
    const contentH = active ? box!.contentHeight : 0;

    return (
      <Positioned key="mindmap-editor-pos" left={left} top={top} width={width} height={height}>
        <Container
          width={width}
          height={height}
          padding={padding}
          color={active ? fill : undefined}
          border={border}
          borderRadius={borderRadius}
          minWidth={active ? minWidth : undefined}
          maxWidth={active ? maxWidth : undefined}
          maxHeight={active ? maxHeight : undefined}
          opacity={active ? 1 : 0}
          pointerEvent={active ? 'auto' : 'none'}
        >
          <Container width={contentW} height={contentH}>
            <TextArea
              key="mindmap-global-textarea"
              ref={(r) => {
                this.textAreaRef = r as TextArea;
                if (this.pendingFocus && this.textAreaRef) {
                  this.pendingFocus = false;
                  const domInput = (
                    this.textAreaRef as unknown as { input?: HTMLTextAreaElement | null }
                  ).input;
                  setTimeout(() => {
                    domInput?.focus?.();
                  }, 0);
                }
              }}
              value={this.state.text}
              disabled={!active}
              fontSize={baseFontSize * scale}
              color={textColor}
              selectionColor={selectionColor}
              cursorColor={textColor}
              autoFocus={false}
              placeholder={'输入文本'}
              onChange={(val: string) => {
                this.setState({ text: val });
                if (active) {
                  this.props.onCommit(val);
                }
              }}
              onKeyDown={(e) => {
                const native = e.nativeEvent as KeyboardEvent;
                const shouldClose =
                  native.key === 'Escape' ||
                  (native.key === 'Enter' &&
                    !native.shiftKey &&
                    !native.altKey &&
                    !native.ctrlKey &&
                    !native.metaKey);
                if (shouldClose) {
                  this.props.onCancel();
                  e.stopPropagation();
                  return false;
                }
                return true;
              }}
              onBlur={() => {
                if (this.suppressNextBlurClose) {
                  this.suppressNextBlurClose = false;
                  return;
                }
                if (active) {
                  this.props.onCancel();
                }
              }}
            />
          </Container>
        </Container>
      </Positioned>
    );
  }
}
