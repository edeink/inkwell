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
import { applyAlpha } from '@/core/helper/color';
import { ScrollView } from '@/core/viewport/scroll-view';
import Runtime from '@/runtime';
import { Themes, type ThemePalette } from '@/styles/theme';

interface GlassCardDemoAppProps extends WidgetProps {
  theme?: ThemePalette;
}

export class GlassCardDemoApp extends StatelessWidget<GlassCardDemoAppProps> {
  render(): Widget {
    // demo 约定：由外部传入当前画布宽高与主题，内部只负责拼装 Widget 树
    const theme = this.props.theme ?? Themes.light;
    const width = this.props.width as number | undefined;
    const height = this.props.height as number | undefined;
    const scrollBarTrackColor = applyAlpha(theme.text.primary, 0.06);
    const scrollBarColor = applyAlpha(theme.text.primary, 0.22);
    const scrollBarHoverColor = applyAlpha(theme.text.primary, 0.32);
    const scrollBarActiveColor = applyAlpha(theme.text.primary, 0.44);

    // 控制整体内容宽度，避免在大屏幕下卡片过宽导致观感变差
    const maxContentW = Math.min(980, (width ?? 980) - 64);
    const cardW = Math.min(560, maxContentW);

    return (
      <ScrollView
        key="glass-card-demo-scroll"
        width={width}
        height={height}
        scrollBarTrackColor={scrollBarTrackColor}
        scrollBarColor={scrollBarColor}
        scrollBarHoverColor={scrollBarHoverColor}
        scrollBarActiveColor={scrollBarActiveColor}
      >
        {/* 外层使用 ScrollView：便于在小屏幕下仍能完整查看示例 */}
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
              {/* 示例 1：显式指定 windowRect，展示“清晰窗口”位置与尺寸可控 */}
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
                    blurPx={24}
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

              {/* 示例 2：同样指定 windowRect，但窗口更宽，用于对比不同构图 */}
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
                    blurPx={24}
                    glassAlpha={theme === Themes.dark ? 0.14 : 0.18}
                    windowRatio={0.32}
                    animate={true}
                    windowRect={{
                      x: 160,
                      y: 10,
                      width: 350,
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
  // React 宿主会在初始化/resize/theme 变更时调用此函数，统一重渲染 demo Widget 树
  runtime.render(<GlassCardDemoApp width={width} height={height} theme={theme} />);
}
