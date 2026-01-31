/** @jsxImportSource @/utils/compiler */
import { FrostedGlassCard } from './frosted-glass-card';
import { resolveGlassCardCompositeLayout } from './glass-card-composite-layout';

import type { GlassCardCompositeProps } from './glass-card-types';
import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  MainAxisAlignment,
  Positioned,
  Stack,
  StatefulWidget,
  Text,
  type Widget,
} from '@/core';
import { CrossAxisAlignment } from '@/core/flex/type';
import { Themes } from '@/styles/theme';

type SuggestedTextStyle = { fill: string; stroke: string };

/**
 * @description GlassCardComposite：组合 FrostedGlassCard 与内容层，并根据采样结果自动调整文字描边/填充色。
 * @param props 组件入参
 * @returns Widget
 * @example
 * ```tsx
 * import { GlassCardComposite } from '@/demo/glass-card/widgets/glass-card';
 * import { Themes } from '@/styles/theme';
 *
 * <GlassCardComposite width={520} height={260} theme={Themes.light} title="标题" subtitle="副标题" />;
 * ```
 */
export class GlassCardComposite extends StatefulWidget<
  GlassCardCompositeProps,
  { textStyle: SuggestedTextStyle | null }
> {
  state: { textStyle: SuggestedTextStyle | null } = { textStyle: null };

  private handleSuggestedTextStyleChange = (style: SuggestedTextStyle) => {
    const prev = this.state.textStyle;
    if (prev && prev.fill === style.fill && prev.stroke === style.stroke) {
      return;
    }
    this.setState({ textStyle: style });
  };

  render(): Widget {
    const theme: ThemePalette = this.props.theme ?? Themes.light;
    const width = typeof this.props.width === 'number' ? this.props.width : 520;
    const height = typeof this.props.height === 'number' ? this.props.height : 260;
    const windowRatio = typeof this.props.windowRatio === 'number' ? this.props.windowRatio : 0.32;
    const layout = resolveGlassCardCompositeLayout({
      width,
      height,
      windowRatio,
      windowRect: this.props.windowRect,
      theme,
      textStyle: this.state.textStyle,
    });

    return (
      <Container key="glass-card-composite" width={width} height={height} color="transparent">
        <Stack key="glass-card-stack">
          <FrostedGlassCard
            key="glass-card-base"
            width={width}
            height={height}
            theme={theme}
            backgroundImageSrc={this.props.imageSrc}
            blurPx={this.props.blurPx}
            glassAlpha={this.props.glassAlpha}
            windowRatio={windowRatio}
            windowRect={layout.windowRect}
            textSampleRect={layout.leftContentW > 0 ? layout.sampleRect : undefined}
            onSuggestedTextStyleChange={
              layout.leftContentW > 0 ? this.handleSuggestedTextStyleChange : undefined
            }
            animate={this.props.animate}
          />

          {layout.leftContentW > 0 ? (
            <Positioned
              key="glass-card-content"
              left={layout.padding}
              top={0}
              width={layout.leftContentW}
              height={height}
            >
              <Container width={layout.leftContentW} height={height} color="transparent">
                <Column
                  key="glass-card-content-col"
                  spacing={10}
                  mainAxisAlignment={MainAxisAlignment.Center}
                  crossAxisAlignment={CrossAxisAlignment.Start}
                >
                  {this.props.title ? (
                    <Text
                      text={this.props.title}
                      fontSize={22}
                      fontWeight="bold"
                      color={layout.textStyle.fill}
                      strokeColor={layout.textStyle.stroke}
                      strokeWidth={3}
                    />
                  ) : null}
                  {this.props.subtitle ? (
                    <Text
                      text={this.props.subtitle}
                      fontSize={14}
                      lineHeight={20}
                      color={layout.textStyle.fill}
                      strokeColor={layout.textStyle.stroke}
                      strokeWidth={2}
                    />
                  ) : null}
                </Column>
              </Container>
            </Positioned>
          ) : null}
        </Stack>
      </Container>
    );
  }
}
