/** @jsxImportSource @/utils/compiler */
import { Swiper } from './widgets/swiper';

import type { ThemePalette } from '@/styles/theme';

import { Center, Container, StatelessWidget, Text, type Widget, type WidgetProps } from '@/core';
import Runtime from '@/runtime';

interface SwiperDemoAppProps extends WidgetProps {
  theme: ThemePalette;
}

export class SwiperDemoApp extends StatelessWidget<SwiperDemoAppProps> {
  constructor(props: SwiperDemoAppProps) {
    super(props);
  }

  render(): Widget {
    const { theme } = this.props;
    const items = [
      <Container key="1" color={theme.danger}>
        <Center>
          <Text text="Item 1" color="#fff" fontSize={24} />
        </Center>
      </Container>,
      <Container key="2" color={theme.primary}>
        <Center>
          <Text text="Item 2" color="#fff" fontSize={24} />
        </Center>
      </Container>,
      <Container key="3" color={theme.success}>
        <Center>
          <Text text="Item 3" color="#fff" fontSize={24} />
        </Center>
      </Container>,
    ];

    return (
      <Container color={theme.background.base}>
        <Center>
          <Swiper items={items} width={400} height={250} interval={2000} theme={theme} />
        </Center>
      </Container>
    );
  }
}

export function runApp(runtime: Runtime, theme: ThemePalette) {
  runtime.render(<SwiperDemoApp theme={theme} />);
}
