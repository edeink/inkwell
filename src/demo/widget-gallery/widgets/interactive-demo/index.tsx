/** @jsxImportSource @/utils/compiler */
import type { WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { Center, Column, Container, Row, Text } from '@/core';
import { MainAxisAlignment, MainAxisSize } from '@/core/flex/type';
import { StatefulWidget } from '@/core/state/stateful';

interface Props extends WidgetProps {
  theme: ThemePalette;
}

interface State {
  [key: string]: unknown;
  count: number;
  active: boolean;
}

export class InteractiveDemo extends StatefulWidget<Props, State> {
  state: State = {
    count: 0,
    active: false,
  };

  handleIncrement = () => {
    this.setState({ count: this.state.count + 1 });
  };

  handleToggle = () => {
    this.setState({ active: !this.state.active });
  };

  render() {
    const { theme } = this.props;
    const { count, active } = this.state;

    return (
      <Column spacing={16} mainAxisSize={MainAxisSize.Min}>
        {/* 计数器示例 */}
        <Row
          spacing={16}
          mainAxisAlignment={MainAxisAlignment.Start}
          mainAxisSize={MainAxisSize.Min}
        >
          <Container
            width={120}
            height={40}
            color={theme.primary}
            borderRadius={4}
            cursor="pointer"
            onClick={this.handleIncrement}
          >
            <Center>
              <Text text={`点击计数: ${count}`} color="#FFFFFF" />
            </Center>
          </Container>

          <Container
            width={120}
            height={40}
            color={theme.background.surface}
            borderRadius={4}
            border={{ width: 1, color: theme.border.base }}
          >
            <Center>
              <Text text={`当前数值: ${count}`} color={theme.text.primary} />
            </Center>
          </Container>
        </Row>

        {/* 状态切换示例 */}
        <Row
          spacing={16}
          mainAxisAlignment={MainAxisAlignment.Start}
          mainAxisSize={MainAxisSize.Min}
        >
          <Container
            width={120}
            height={40}
            color={active ? theme.success : theme.text.secondary}
            borderRadius={4}
            cursor="pointer"
            onClick={this.handleToggle}
          >
            <Center>
              <Text text={active ? '状态: 开启' : '状态: 关闭'} color="#FFFFFF" />
            </Center>
          </Container>

          {active && (
            <Container width={120} height={40} color={theme.warning} borderRadius={4}>
              <Center>
                <Text text="激活显示" color="#FFFFFF" />
              </Center>
            </Container>
          )}
        </Row>
      </Column>
    );
  }
}
