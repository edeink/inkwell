/** @jsxImportSource @/utils/compiler */
import type { WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { Container } from '@/core';
import { StatelessWidget } from '@/core/state/stateless';

export interface CornerHeaderProps extends WidgetProps {
  theme: ThemePalette;
  width: number;
  height: number;
}

export class CornerHeader extends StatelessWidget<CornerHeaderProps> {
  render() {
    return (
      <Container
        width={this.props.width}
        height={this.props.height}
        color={this.props.theme.component.headerBg}
      />
    );
  }
}
