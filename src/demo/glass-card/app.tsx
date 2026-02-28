/** @jsxImportSource @/utils/compiler */

import demo00ImageUrl from '../assets/demo-00.jpeg?url';
import demo01ImageUrl from '../assets/demo-01.jpeg?url';

import { buttonVariants, GlassButton } from './widgets/glass-button/index';
import { GlassCalendar } from './widgets/glass-calendar';
import { GlassCardComposite } from './widgets/glass-card';
import { GlassChartCard } from './widgets/glass-chart';

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
    const safeWidth = typeof width === 'number' && width > 0 ? width : 980;
    const maxContentW = Math.min(980, Math.max(0, safeWidth - 64));
    const cardW = Math.min(560, maxContentW);

    const buttonGridColumns = 3;
    const buttonGridGap = 16;
    const buttonGridInnerW = Math.max(0, cardW - 24);
    const buttonW = Math.max(
      160,
      Math.floor((buttonGridInnerW - buttonGridGap * (buttonGridColumns - 1)) / buttonGridColumns),
    );
    const buttonH = 76;

    const glassScale = 0.8;
    const glassCardW = Math.round(Math.min(520, cardW) * glassScale);
    const glassCardH = Math.round(260 * glassScale);
    const glassBlurPx = Math.max(1, Math.round(24 * glassScale));

    const buttonGrid: Array<typeof buttonVariants> = [[], [], []];
    for (let i = 0; i < buttonVariants.length; i++) {
      buttonGrid[i % buttonGridColumns].push(buttonVariants[i]);
    }

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
          <Padding padding={32}>
            <Column
              key="glass-card-demo-root"
              mainAxisAlignment={MainAxisAlignment.Start}
              crossAxisAlignment={CrossAxisAlignment.Center}
              spacing={24}
              mainAxisSize={MainAxisSize.Max}
            >
              <Column key="glass-card-header" spacing={8} mainAxisSize={MainAxisSize.Min}>
                <Text
                  text="Glass Components"
                  fontSize={30}
                  fontWeight="bold"
                  color={theme.text.primary}
                />
                <Text
                  text="Canvas2D 自绘玻璃拟态：磨砂卡片、弧带日历、图标摘要、磨砂按钮。"
                  fontSize={14}
                  color={theme.text.secondary}
                />
              </Column>

              <Column spacing={12} mainAxisSize={MainAxisSize.Min}>
                <Text text="磨砂卡片" fontSize={18} fontWeight="bold" color={theme.text.primary} />
                <Row
                  spacing={24}
                  mainAxisSize={MainAxisSize.Min}
                  crossAxisAlignment={CrossAxisAlignment.Start}
                >
                  {/* 示例 1：显式指定 windowRect，展示“清晰窗口”位置与尺寸可控 */}
                  <Container width={420} height={320} color="transparent" isRepaintBoundary={true}>
                    <Center>
                      <GlassCardComposite
                        width={glassCardW}
                        height={glassCardH}
                        theme={theme}
                        title="比卡超"
                        subtitle="脸颊蓄电，释放电击。"
                        imageSrc={demo00ImageUrl}
                        blurPx={glassBlurPx}
                        glassAlpha={theme === Themes.dark ? 0.14 : 0.18}
                        windowRatio={0.32}
                        animate={false}
                        windowRect={{
                          x: Math.round(150 * glassScale),
                          y: Math.round(10 * glassScale),
                          width: Math.round(220 * glassScale),
                          height: Math.round(240 * glassScale),
                          radius: Math.round(20 * glassScale),
                        }}
                      />
                    </Center>
                  </Container>

                  {/* 示例 2：同样指定 windowRect，但窗口更宽，用于对比不同构图 */}
                  <Container width={420} height={320} color="transparent" isRepaintBoundary={true}>
                    <Center>
                      <GlassCardComposite
                        width={glassCardW}
                        height={glassCardH}
                        theme={theme}
                        title="耿鬼"
                        subtitle="潜伏黑夜，擅长恶作剧。"
                        imageSrc={demo01ImageUrl}
                        blurPx={glassBlurPx}
                        glassAlpha={theme === Themes.dark ? 0.14 : 0.18}
                        windowRatio={0.32}
                        animate={true}
                        windowRect={{
                          x: Math.round(160 * glassScale),
                          y: Math.round(10 * glassScale),
                          width: Math.round(350 * glassScale),
                          height: Math.round(240 * glassScale),
                          radius: Math.round(18 * glassScale),
                        }}
                      />
                    </Center>
                  </Container>
                </Row>
                <Text text="日历卡片" fontSize={18} fontWeight="bold" color={theme.text.primary} />
                <Container
                  width={cardW}
                  height={Math.min(360, (height ?? 640) - 140)}
                  color="transparent"
                  isRepaintBoundary={true}
                >
                  <Center>
                    <GlassCalendar width={Math.min(520, cardW)} height={320} theme={theme} />
                  </Center>
                </Container>
                <Text text="磨砂图表" fontSize={18} fontWeight="bold" color={theme.text.primary} />
                <Container
                  width={Math.min(360, cardW)}
                  height={Math.min(480, (height ?? 720) - 140)}
                  color="transparent"
                  isRepaintBoundary={true}
                >
                  <Center>
                    <GlassChartCard
                      width={Math.min(340, cardW)}
                      height={460}
                      theme={theme}
                      title="Chart"
                      progress={0.36}
                    />
                  </Center>
                </Container>
                <Text
                  text="磨砂玻璃按钮"
                  fontSize={18}
                  fontWeight="bold"
                  color={theme.text.primary}
                />
                <Container width={cardW} color="transparent" isRepaintBoundary={true}>
                  <Padding padding={12}>
                    <Row
                      spacing={buttonGridGap}
                      mainAxisSize={MainAxisSize.Min}
                      crossAxisAlignment={CrossAxisAlignment.Start}
                    >
                      {buttonGrid.map((col, colIndex) => (
                        <Column
                          key={`glass-btn-col-${colIndex}`}
                          spacing={buttonGridGap}
                          mainAxisSize={MainAxisSize.Min}
                        >
                          {col.map((v) => (
                            <GlassButton
                              key={`glass-btn-${v.activeVariant}`}
                              width={buttonW}
                              height={buttonH}
                              theme={theme}
                              text={v.text}
                              glyph={v.glyph}
                              tint={v.tint}
                              activeVariant={v.activeVariant}
                              config={v.config}
                            />
                          ))}
                        </Column>
                      ))}
                    </Row>
                  </Padding>
                </Container>
              </Column>
            </Column>
          </Padding>
        </Container>
      </ScrollView>
    );
  }
}

export function runApp(runtime: Runtime, width: number, height: number, theme?: ThemePalette) {
  // React 宿主会在初始化/resize/theme 变更时调用此函数，统一重渲染 demo Widget 树
  runtime.render(<GlassCardDemoApp width={width} height={height} theme={theme} />);
}
