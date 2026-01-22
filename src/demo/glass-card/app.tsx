/** @jsxImportSource @/utils/compiler */

import demo00ImageUrl from './assets/demo-00.jpeg?url';
import demo01ImageUrl from './assets/demo-01.jpeg?url';
import { GlassCardComposite } from './widgets/glass-card-composite';

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

interface GlassCardDemoAppProps extends WidgetProps {
  theme?: ThemePalette;
}

export class GlassCardDemoApp extends StatelessWidget<GlassCardDemoAppProps> {
  render(): Widget {
    const theme = this.props.theme ?? Themes.light;
    const width = this.props.width as number | undefined;
    const height = this.props.height as number | undefined;

    const maxContentW = Math.min(980, (width ?? 980) - 64);
    const cardW = Math.min(560, maxContentW);

    return (
      <ScrollView key="glass-card-demo-scroll" width={width} height={height}>
        <Container minWidth={width} alignment="center" color={theme.background.base}>
          <Column
            key="glass-card-demo-root"
            mainAxisAlignment={MainAxisAlignment.Start}
            crossAxisAlignment={CrossAxisAlignment.Center}
            spacing={24}
            mainAxisSize={MainAxisSize.Max}
            padding={32}
          >
            <Column key="glass-card-header" spacing={8} mainAxisSize={MainAxisSize.Min}>
              <Text
                text="Frosted Glass Card"
                fontSize={30}
                fontWeight="bold"
                color={theme.text.primary}
              />
              <Text
                text="3 层叠加 + 右侧清晰窗口（Canvas2D），支持主题与自带动画。"
                fontSize={14}
                color={theme.text.secondary}
              />
            </Column>

            <Row
              spacing={24}
              mainAxisSize={MainAxisSize.Min}
              crossAxisAlignment={CrossAxisAlignment.Start}
            >
              <Container
                width={cardW}
                height={Math.min(320, (height ?? 600) - 140)}
                color="transparent"
                isRepaintBoundary={true}
              >
                <Center>
                  <GlassCardComposite
                    width={Math.min(520, cardW)}
                    height={260}
                    theme={theme}
                    title="比卡超"
                    subtitle="活泼可爱的电气鼠宝可梦，以蓄电的脸颊电袋释放强力电击，象征伙伴与勇气。"
                    imageSrc={demo00ImageUrl}
                    blurPx={12}
                    glassAlpha={theme === Themes.dark ? 0.14 : 0.18}
                    windowRatio={0.32}
                    animate={true}
                    windowRect={{
                      x: 150,
                      y: 10,
                      width: 220,
                      height: 240,
                      radius: 20,
                    }}
                  />
                </Center>
              </Container>

              <Container
                width={cardW}
                height={Math.min(320, (height ?? 600) - 140)}
                color="transparent"
                isRepaintBoundary={true}
              >
                <Center>
                  <GlassCardComposite
                    width={Math.min(520, cardW)}
                    height={260}
                    theme={theme}
                    title="耿鬼"
                    subtitle="狡黠阴郁的幽灵宝可梦，潜伏于影子与黑夜间以恶作剧和诡计扰乱对手。"
                    imageSrc={demo01ImageUrl}
                    blurPx={12}
                    glassAlpha={theme === Themes.dark ? 0.14 : 0.18}
                    windowRatio={0.32}
                    animate={true}
                    windowRect={{
                      x: 200,
                      y: 10,
                      width: 310,
                      height: 240,
                      radius: 18,
                    }}
                  />
                </Center>
              </Container>
            </Row>

            <Padding padding={{ top: 8 }}>
              <Text
                text="提示：右侧窗口区域不参与磨砂；磨砂层使用 blur(filter) 并带有多重采样回退。"
                fontSize={12}
                color={theme.text.secondary}
              />
            </Padding>
          </Column>
        </Container>
      </ScrollView>
    );
  }
}

export function runApp(runtime: Runtime, width: number, height: number, theme?: ThemePalette) {
  runtime.render(<GlassCardDemoApp width={width} height={height} theme={theme} />);
}
