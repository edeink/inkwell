/** @jsxImportSource @/utils/compiler */
import type { WidgetProps } from '@/core/base';

import { Container } from '@/core';
import { StatelessWidget } from '@/core/state/stateless';

export interface CornerHeaderProps extends WidgetProps {
  width: number;
  height: number;
}

export class CornerHeader extends StatelessWidget<CornerHeaderProps> {
  render() {
    return <Container width={this.props.width} height={this.props.height} color="#f8f9fa" />;
  }
}
