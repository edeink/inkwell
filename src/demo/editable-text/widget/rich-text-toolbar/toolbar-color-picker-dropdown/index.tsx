/** @jsxImportSource @/utils/compiler */
/**
 * 文件用途：RichTextToolbar 内部复用的颜色选择面板组件（Widget）。
 * 主要功能：按预设色渲染色板网格，支持 hover 提示与点击选色回调。
 * 作者：InkWell 团队
 * 最后修改日期：2026-01-24
 */
import { toolbarConstants } from '../constants';

import type { RichTextColorPreset } from '../index';
import type { ThemePalette } from '@/styles/theme';

import {
  ClipRect,
  Column,
  Container,
  CrossAxisAlignment,
  Positioned,
  Row,
  type InkwellEvent,
} from '@/core';

export interface ToolbarColorPickerDropdownProps {
  widgetKey: string;
  theme: ThemePalette;
  left: number;
  top: number;
  cols: number;
  swatchSize: number;
  gap: number;
  padding: number;
  presets: ReadonlyArray<RichTextColorPreset>;
  hoveredKey: string | null;
  onHoverKey: (key: string | null) => void;
  swatchWidgetKey: (color: string) => string;
  onPick: (color: string) => void;
  onPointerLeave?: (e: InkwellEvent) => void;
}

export function ToolbarColorPickerDropdown(props: ToolbarColorPickerDropdownProps) {
  const panelW =
    props.padding * 2 + props.cols * props.swatchSize + Math.max(0, props.cols - 1) * props.gap;

  return (
    <Positioned key={props.widgetKey} left={props.left} top={props.top}>
      <ClipRect borderRadius={toolbarConstants.toolbarRadius}>
        <Container
          width={panelW}
          borderRadius={toolbarConstants.toolbarRadius}
          border={{ color: props.theme.border.base, width: 1 }}
          color={props.theme.background.container}
          padding={[props.padding, props.padding]}
          pointerEvent="auto"
          onPointerLeave={props.onPointerLeave}
        >
          <Column spacing={props.gap} crossAxisAlignment={CrossAxisAlignment.Start}>
            {Array.from({ length: Math.ceil(props.presets.length / props.cols) }).map((_, ri) => {
              const rowPresets = props.presets.slice(ri * props.cols, ri * props.cols + props.cols);
              return (
                <Row key={`rt-color-row-${ri}`} spacing={props.gap}>
                  {rowPresets.map((c) => (
                    <Container
                      key={props.swatchWidgetKey(c.value)}
                      width={props.swatchSize}
                      height={props.swatchSize}
                      borderRadius={toolbarConstants.triggerRadius}
                      border={{ color: 'rgba(0,0,0,0.15)', width: 1 }}
                      color={c.value}
                      cursor="pointer"
                      pointerEvent="auto"
                      onPointerEnter={() => props.onHoverKey(`c-${c.value}`)}
                      onPointerLeave={() => props.onHoverKey(null)}
                      onPointerDown={(e: InkwellEvent) => {
                        e.stopPropagation?.();
                        props.onPick(c.value);
                      }}
                    >
                      {props.hoveredKey === `c-${c.value}` && (
                        <Container
                          width={props.swatchSize}
                          height={props.swatchSize}
                          borderRadius={toolbarConstants.triggerRadius}
                          color="rgba(255,255,255,0.18)"
                          pointerEvent="none"
                        />
                      )}
                    </Container>
                  ))}
                </Row>
              );
            })}
          </Column>
        </Container>
      </ClipRect>
    </Positioned>
  );
}
