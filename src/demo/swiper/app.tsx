/** @jsxImportSource @/utils/compiler */
import { Swiper } from './widgets/swiper';

import { Center, Container, StatelessWidget, Text, type Widget } from '@/core';
import Runtime from '@/runtime';

export class SwiperDemoApp extends StatelessWidget {
  render(): Widget {
    const items = [
      <Container key="1" color="#FF5252">
        <Center>
          <Text text="Item 1" color="#fff" fontSize={24} />
        </Center>
      </Container>,
      <Container key="2" color="#448AFF">
        <Center>
          <Text text="Item 2" color="#fff" fontSize={24} />
        </Center>
      </Container>,
      <Container key="3" color="#69F0AE">
        <Center>
          <Text text="Item 3" color="#fff" fontSize={24} />
        </Center>
      </Container>,
    ];

    return (
      <Container color="#ffffff">
        <Center>
          <Swiper items={items} width={400} height={250} autoplay={true} interval={2000} />
        </Center>
      </Container>
    );
  }
}

export function runApp(runtime: Runtime) {
  runtime.render(<SwiperDemoApp />);
}
