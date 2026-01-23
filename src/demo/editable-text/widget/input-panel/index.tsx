/** @jsxImportSource @/utils/compiler */

/**
 * InputPanel：单行输入示例（Input + 外观容器 + 状态展示）。
 *
 * 说明：这里不封装编辑能力，只负责 demo 中的组合与对齐。
 */
import type { WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { Column, Container, CrossAxisAlignment, Input, Padding, Text } from '@/core';
import { StatelessWidget } from '@/core/state/stateless';

export interface InputPanelProps extends WidgetProps {
  theme: ThemePalette;
  value: string;
  onChange: (value: string) => void;
}

export class InputPanel extends StatelessWidget<InputPanelProps> {
  protected render() {
    const { theme, value, onChange } = this.props;
    const borderColor = theme.border.base;

    return (
      <Column spacing={10} crossAxisAlignment={CrossAxisAlignment.Start}>
        <Text text="单行编辑器 (Input)" fontSize={16} color={theme.text.secondary} />
        <Container
          width={300}
          height={42}
          border={{ color: borderColor, width: 1 }}
          borderRadius={4}
          color={theme.background.container}
        >
          <Padding padding={{ left: 12, top: 10, right: 12, bottom: 10 }}>
            <Input
              value={value}
              onChange={onChange}
              color={theme.text.primary}
              fontSize={14}
              selectionColor={theme.state.focus}
              cursorColor={theme.text.primary}
            />
          </Padding>
        </Container>
        <Container width={300}>
          <Text text={`当前值: ${value}`} fontSize={12} color={theme.text.placeholder} />
        </Container>
      </Column>
    );
  }
}
