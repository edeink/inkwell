/** @jsxImportSource @/utils/compiler */
import { DemoCard, Section } from './components';
import { Swiper } from './widgets/swiper';

import {
  Center,
  Column,
  Container,
  MainAxisAlignment,
  MainAxisSize,
  Padding,
  Row,
  StatelessWidget,
  Text,
  type Widget,
  type WidgetProps,
} from '@/core';
import { CrossAxisAlignment } from '@/core/flex/type';
import { ScrollView } from '@/core/viewport/scroll-view';
import Runtime from '@/runtime';
import { Themes, type ThemePalette } from '@/styles/theme';

interface SwiperDemoAppProps extends WidgetProps {
  theme?: ThemePalette;
}

export class SwiperDemoApp extends StatelessWidget<SwiperDemoAppProps> {
  constructor(props: SwiperDemoAppProps) {
    super(props);
  }

  render(): Widget {
    const theme = this.props.theme || Themes.light;
    const { width, height } = this.props;

    // Helper to create colored pages
    const createPages = (prefix: string, count: number = 3) =>
      Array.from({ length: count }).map((_, i) => {
        const colors = [theme.primary, theme.success, theme.warning, theme.danger];
        return (
          <Container key={`${prefix}-page-${i}`} color={colors[i % colors.length]}>
            <Center>
              <Text text={`Page ${i + 1}`} color="#FFFFFF" fontSize={24} fontWeight="bold" />
            </Center>
          </Container>
        );
      });

    return (
      <ScrollView key="root-scroll-view" width={width} height={height}>
        <Container minWidth={width} alignment="center" color={theme.background.base}>
          <Column
            key="demo-root"
            mainAxisAlignment={MainAxisAlignment.Start}
            crossAxisAlignment={CrossAxisAlignment.Center}
            spacing={32}
            mainAxisSize={MainAxisSize.Max}
            padding={32}
          >
            {/* Header */}
            <Column key="header" spacing={8} mainAxisSize={MainAxisSize.Min}>
              <Text
                key="title"
                text="Swiper 轮播组件"
                fontSize={32}
                fontWeight="bold"
                color={theme.text.primary}
              />
              <Text
                key="subtitle"
                text="支持手势滑动、自动播放、无限循环的轮播组件"
                fontSize={16}
                color={theme.text.secondary}
              />
            </Column>

            {/* 1. Basic Usage */}
            <Section title="1. 基础用法 (Basic)" theme={theme}>
              <DemoCard title="默认配置 (3页)" theme={theme} width={450}>
                <Swiper
                  key="swiper-basic"
                  items={createPages('basic')}
                  width={400}
                  height={200}
                  theme={theme}
                />
              </DemoCard>
            </Section>

            {/* 2. Autoplay */}
            <Section title="2. 自动播放 (Autoplay)" theme={theme}>
              <Row spacing={20} mainAxisSize={MainAxisSize.Min}>
                <DemoCard title="每2秒切换" theme={theme} width={350}>
                  <Swiper
                    key="swiper-auto-2s"
                    items={createPages('auto-2s')}
                    width={300}
                    height={180}
                    autoplay={true}
                    interval={2000}
                    theme={theme}
                  />
                </DemoCard>
                <DemoCard title="每5秒切换 (慢速)" theme={theme} width={350}>
                  <Swiper
                    key="swiper-auto-5s"
                    items={createPages('auto-5s')}
                    width={300}
                    height={180}
                    autoplay={true}
                    interval={5000}
                    theme={theme}
                  />
                </DemoCard>
              </Row>
            </Section>

            {/* 3. Animation Duration */}
            <Section title="3. 动画时长 (Duration)" theme={theme}>
              <Row spacing={20} mainAxisSize={MainAxisSize.Min}>
                <DemoCard title="快速切换 (150ms)" theme={theme} width={350}>
                  <Swiper
                    key="swiper-fast"
                    items={createPages('fast')}
                    width={300}
                    height={180}
                    duration={150}
                    theme={theme}
                  />
                </DemoCard>
                <DemoCard title="慢速切换 (800ms)" theme={theme} width={350}>
                  <Swiper
                    key="swiper-slow"
                    items={createPages('slow')}
                    width={300}
                    height={180}
                    duration={800}
                    theme={theme}
                  />
                </DemoCard>
              </Row>
            </Section>

            {/* 4. Custom Size */}
            <Section title="4. 自定义尺寸" theme={theme}>
              <DemoCard title="小尺寸 (200x100)" theme={theme} width={250}>
                <Swiper
                  key="swiper-mini"
                  items={createPages('mini')}
                  width={200}
                  height={100}
                  theme={theme}
                />
              </DemoCard>
            </Section>

            <Padding padding={[20, 0]}>
              <Text key="footer" text="End of Demos" fontSize={12} color={theme.text.secondary} />
            </Padding>
          </Column>
        </Container>
      </ScrollView>
    );
  }
}

export function runApp(runtime: Runtime, width: number, height: number, theme: ThemePalette) {
  runtime.render(<SwiperDemoApp width={width} height={height} theme={theme} />);
}
