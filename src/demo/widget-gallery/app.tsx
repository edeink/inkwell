/** @jsxImportSource @/utils/compiler */
import { DemoCard } from './widgets/demo-card';
import { InteractiveDemo } from './widgets/interactive-demo';
import { Section } from './widgets/section';

import {
  Center,
  Column,
  Container,
  Expanded,
  Image,
  ImageFit,
  Padding,
  Positioned,
  Row,
  SizedBox,
  Stack,
  Text,
  TextAlign,
  Wrap,
} from '@/core';
import { CrossAxisAlignment, MainAxisAlignment, MainAxisSize } from '@/core/flex/type';
import { applyAlpha } from '@/core/helper/color';
import { ScrollView } from '@/core/viewport/scroll-view';
import Runtime from '@/runtime';
import { Themes, type ThemePalette } from '@/styles/theme';

/**
 * 演示页面的主入口
 * 展示了核心组件的组合使用方式，包括布局、定位、交互等
 */
export const WidgetGalleryDemo = ({
  width,
  height,
  theme,
}: {
  width?: number;
  height?: number;
  theme?: ThemePalette;
}) => {
  const currentTheme = theme || Themes.light;
  const scrollBarTrackColor = applyAlpha(currentTheme.text.primary, 0.06);
  const scrollBarColor = applyAlpha(currentTheme.text.primary, 0.22);
  const scrollBarHoverColor = applyAlpha(currentTheme.text.primary, 0.32);
  const scrollBarActiveColor = applyAlpha(currentTheme.text.primary, 0.44);

  return (
    <ScrollView
      key="root-scroll-view"
      width={width}
      height={height}
      scrollBarTrackColor={scrollBarTrackColor}
      scrollBarColor={scrollBarColor}
      scrollBarHoverColor={scrollBarHoverColor}
      scrollBarActiveColor={scrollBarActiveColor}
    >
      <Container minWidth={width} alignment="center">
        <Column
          key="complete-demo-root"
          mainAxisAlignment={MainAxisAlignment.Center}
          crossAxisAlignment={CrossAxisAlignment.Start}
          spacing={24}
          mainAxisSize={MainAxisSize.Max}
          padding={24}
        >
          {/* 标题区域 */}
          <Column key="header-section" spacing={8} mainAxisSize={MainAxisSize.Min}>
            <Text
              key="demo-title"
              text="Inkwell 组件库展示"
              fontSize={32}
              height={40}
              lineHeight={40}
              color={currentTheme.text.primary}
              fontWeight="bold"
            />
            <Text
              key="demo-subtitle"
              text="基于 Canvas 的高性能 UI 渲染框架演示"
              fontSize={16}
              color={currentTheme.text.secondary}
            />
          </Column>

          {/* 基础布局组件 (Container & Padding) */}
          <Section title="1. 基础容器 (Container & Padding)" theme={currentTheme}>
            <Row key="container-examples" spacing={20} mainAxisSize={MainAxisSize.Min}>
              {/* 基础容器 */}
              <DemoCard title="基础样式" theme={currentTheme}>
                <Container
                  key="basic-container"
                  width={120}
                  height={80}
                  color={currentTheme.primary}
                  padding={12}
                >
                  <Center>
                    <Text
                      key="basic-text"
                      text="盒子"
                      fontSize={16}
                      color="#FFFFFF"
                      fontWeight="bold"
                    />
                  </Center>
                </Container>
              </DemoCard>

              {/* 圆角容器 */}
              <DemoCard title="圆角与边框" theme={currentTheme}>
                <Container
                  key="rounded-container"
                  width={120}
                  height={80}
                  color={currentTheme.success}
                  borderRadius={12}
                  border={{ width: 2, color: currentTheme.warning }}
                >
                  <Center>
                    <Text
                      key="rounded-text"
                      text="圆角"
                      fontSize={16}
                      color="#FFFFFF"
                      fontWeight="bold"
                    />
                  </Center>
                </Container>
              </DemoCard>
            </Row>
          </Section>

          {/* 弹性布局 (Row & Column) */}
          <Section title="2. 弹性布局 (Row & Column)" theme={currentTheme}>
            <Column key="flex-examples" spacing={16} mainAxisSize={MainAxisSize.Min}>
              <DemoCard title="水平布局: 两端对齐" width={400} theme={currentTheme}>
                <Container
                  key="row-container"
                  width={360}
                  height={60}
                  color={currentTheme.background.surface}
                  padding={8}
                  borderRadius={4}
                >
                  <Row
                    key="row-flex"
                    mainAxisAlignment={MainAxisAlignment.SpaceBetween}
                    crossAxisAlignment={CrossAxisAlignment.Center}
                    mainAxisSize={MainAxisSize.Max}
                  >
                    {[1, 2, 3].map((i) => (
                      <Container
                        key={`row-item-${i}`}
                        width={60}
                        height={44}
                        color={currentTheme.primary}
                        borderRadius={4}
                      >
                        <Center>
                          <Text key={`t-${i}`} text={`${i}`} color="#FFFFFF" />
                        </Center>
                      </Container>
                    ))}
                  </Row>
                </Container>
              </DemoCard>

              <DemoCard title="垂直布局: 起始对齐" width={400} theme={currentTheme}>
                <Container
                  key="col-container"
                  width={360}
                  height={120}
                  color={currentTheme.background.surface}
                  padding={8}
                  borderRadius={4}
                >
                  <Column
                    key="col-flex"
                    mainAxisAlignment={MainAxisAlignment.Start}
                    crossAxisAlignment={CrossAxisAlignment.Start}
                    spacing={8}
                  >
                    {[1, 2].map((i) => (
                      <Container
                        key={`col-item-${i}`}
                        width={100 + i * 40}
                        height={30}
                        color={currentTheme.success}
                        borderRadius={4}
                      >
                        <Center>
                          <Text key={`tc-${i}`} text={`项目 ${i}`} color="#FFFFFF" />
                        </Center>
                      </Container>
                    ))}
                  </Column>
                </Container>
              </DemoCard>
            </Column>
          </Section>

          {/* 层叠布局 (Stack & Positioned) */}
          <Section title="3. 层叠布局 (Stack & Positioned)" theme={currentTheme}>
            <DemoCard title="头像角标示例" theme={currentTheme}>
              <Container
                key="stack-container"
                width={100}
                height={100}
                color={currentTheme.background.surface}
                borderRadius={8}
              >
                <Stack key="stack-demo">
                  {/* 底部头像 */}
                  <Container
                    key="avatar"
                    width={80}
                    height={80}
                    color={currentTheme.primary}
                    borderRadius={40}
                    margin={{ left: 10, top: 10 }}
                  />
                  {/* 右上角徽标 */}
                  <Positioned key="badge" right={5} top={5}>
                    <Container
                      key="badge-container"
                      width={24}
                      height={24}
                      color={currentTheme.danger}
                      borderRadius={12}
                      border={{ width: 2, color: '#FFFFFF' }}
                    >
                      <Center>
                        <Text
                          key="badge-text"
                          text="1"
                          fontSize={12}
                          color="#FFFFFF"
                          fontWeight="bold"
                        />
                      </Center>
                    </Container>
                  </Positioned>
                </Stack>
              </Container>
            </DemoCard>
          </Section>

          {/* 文本样式 (Text) */}
          <Section title="4. 文本样式 (Text)" theme={currentTheme}>
            <DemoCard title="字体与对齐" theme={currentTheme}>
              <Column key="text-examples" spacing={12} mainAxisSize={MainAxisSize.Min}>
                <Text
                  key="text-h1"
                  text="标题 H1 (32px Bold)"
                  fontSize={32}
                  fontWeight="bold"
                  color={currentTheme.text.primary}
                />
                <Text
                  key="text-h2"
                  text="标题 H2 (24px Bold)"
                  fontSize={24}
                  fontWeight="bold"
                  color={currentTheme.text.primary}
                />
                <Text
                  key="text-body"
                  text="正文内容：Inkwell 支持多种文本样式，包括字体大小、颜色、粗细、行高以及对齐方式。这是一段较长的文本，用于展示自动换行效果。"
                  fontSize={14}
                  color={currentTheme.text.secondary}
                  lineHeight={20}
                />
                <Container
                  key="text-align-container"
                  width={300}
                  color={currentTheme.background.surface}
                  padding={8}
                >
                  <Text
                    key="text-center"
                    text="居中对齐文本"
                    fontSize={14}
                    color={currentTheme.primary}
                    textAlign={TextAlign.Center}
                  />
                </Container>
              </Column>
            </DemoCard>
          </Section>

          {/* 自动伸缩 (Expanded) */}
          <Section title="5. 自动伸缩 (Expanded)" theme={currentTheme}>
            <DemoCard title="填充剩余空间" width={400} theme={currentTheme}>
              <Container
                key="expanded-container"
                color={currentTheme.background.surface}
                borderRadius={4}
              >
                <Row key="expanded-row" mainAxisSize={MainAxisSize.Max}>
                  <Container key="fixed-left" width={60} height={50} color={currentTheme.primary} />
                  <Expanded key="expanded-middle" flex={{ flex: 1 }}>
                    <Container key="flex-content" height={50} color={currentTheme.success}>
                      <Center>
                        <Text key="flex-text" text="Flex: 1" color="#FFFFFF" />
                      </Center>
                    </Container>
                  </Expanded>
                  <Container
                    key="fixed-right"
                    width={60}
                    height={50}
                    color={currentTheme.primary}
                  />
                </Row>
              </Container>
            </DemoCard>
          </Section>

          {/* 流式布局 (Wrap) */}
          <Section title="6. 流式布局 (Wrap)" theme={currentTheme}>
            <DemoCard title="自动换行布局 (响应式宽度)" theme={currentTheme}>
              <Container
                key="wrap-container"
                color={currentTheme.background.surface}
                padding={10}
                borderRadius={4}
              >
                <Wrap key="wrap-demo" spacing={10} runSpacing={10}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                    <Container
                      key={`wrap-item-${i}`}
                      width={80}
                      height={40}
                      color={currentTheme.primary}
                      borderRadius={4}
                    >
                      <Center>
                        <Text
                          key={`wrap-text-${i}`}
                          text={`项目 ${i}`}
                          color="#FFFFFF"
                          fontSize={12}
                        />
                      </Center>
                    </Container>
                  ))}
                </Wrap>
              </Container>
            </DemoCard>
          </Section>

          {/* 图片组件 (Image) */}
          <Section title="7. 图片展示 (Image)" theme={currentTheme}>
            <DemoCard title="图片填充模式" theme={currentTheme}>
              <Row key="image-row" spacing={20} mainAxisSize={MainAxisSize.Min}>
                <Column key="image-col-contain" spacing={8} mainAxisSize={MainAxisSize.Min}>
                  <Container
                    key="img-container-1"
                    width={100}
                    height={100}
                    border={{ width: 1, color: currentTheme.border.base }}
                  >
                    <Image
                      key="img-contain"
                      type="image"
                      src="/assets/logo.png"
                      fit={ImageFit.Contain}
                    />
                  </Container>
                  <Text
                    key="txt-contain"
                    text="Contain"
                    fontSize={12}
                    color={currentTheme.text.primary}
                  />
                </Column>
                <Column key="image-col-cover" spacing={8} mainAxisSize={MainAxisSize.Min}>
                  <Container
                    key="img-container-2"
                    width={100}
                    height={100}
                    border={{ width: 1, color: currentTheme.border.base }}
                  >
                    <Image
                      key="img-cover"
                      type="image"
                      src="/assets/logo.png"
                      fit={ImageFit.Cover}
                    />
                  </Container>
                  <Text
                    key="txt-cover"
                    text="Cover"
                    fontSize={12}
                    color={currentTheme.text.primary}
                  />
                </Column>
              </Row>
            </DemoCard>
          </Section>

          {/* 间距组件 (SizedBox) */}
          <Section title="8. 间距组件 (SizedBox)" theme={currentTheme}>
            <DemoCard title="固定间距" theme={currentTheme}>
              <Row key="sizedbox-row" mainAxisSize={MainAxisSize.Min}>
                <Container key="box1" width={50} height={50} color={currentTheme.primary} />
                <SizedBox key="spacer" width={30} />
                <Container key="box2" width={50} height={50} color={currentTheme.success} />
              </Row>
            </DemoCard>
          </Section>

          {/* 滚动视图 (ScrollView) */}
          <Section title="9. 滚动视图 (ScrollView)" theme={currentTheme}>
            <DemoCard title="可滚动内容" theme={currentTheme}>
              <Container
                key="scroll-container-wrapper"
                border={{ width: 1, color: currentTheme.border.base }}
              >
                <ScrollView
                  key="inner-scroll-view"
                  width={200}
                  height={150}
                  scrollBarTrackColor={scrollBarTrackColor}
                  scrollBarColor={scrollBarColor}
                  scrollBarHoverColor={scrollBarHoverColor}
                  scrollBarActiveColor={scrollBarActiveColor}
                >
                  <Column
                    key="scroll-col"
                    spacing={10}
                    padding={10}
                    mainAxisSize={MainAxisSize.Min}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <Container
                        key={`scroll-item-${i}`}
                        width={160}
                        height={30}
                        color={i % 2 === 0 ? currentTheme.primary : currentTheme.success}
                        borderRadius={4}
                      >
                        <Center>
                          <Text
                            key={`scroll-text-${i}`}
                            text={`滚动项目 ${i}`}
                            color="#FFFFFF"
                            fontSize={12}
                          />
                        </Center>
                      </Container>
                    ))}
                  </Column>
                </ScrollView>
              </Container>
            </DemoCard>
          </Section>

          {/* 交互演示 (Interaction) */}
          <Section title="10. 交互演示 (Interaction)" theme={currentTheme}>
            <Row spacing={20} mainAxisSize={MainAxisSize.Min}>
              <DemoCard title="点击与光标" theme={currentTheme}>
                <Row key="interaction-row" spacing={20} mainAxisSize={MainAxisSize.Min}>
                  <Container
                    key="btn-click"
                    width={100}
                    height={40}
                    color={currentTheme.primary}
                    borderRadius={4}
                    cursor="pointer"
                    onClick={() => console.log('点击了按钮')}
                  >
                    <Center>
                      <Text key="btn-text" text="点击我" color="#FFFFFF" />
                    </Center>
                  </Container>

                  <Container
                    key="btn-hover"
                    width={100}
                    height={40}
                    color={currentTheme.success}
                    borderRadius={4}
                    cursor="not-allowed"
                  >
                    <Center>
                      <Text key="hover-text" text="禁止点击" color="#FFFFFF" />
                    </Center>
                  </Container>
                </Row>
              </DemoCard>

              <DemoCard title="状态交互示例" theme={currentTheme}>
                <InteractiveDemo theme={currentTheme} />
              </DemoCard>
            </Row>
          </Section>

          <Padding padding={[20, 0]}>
            <Text
              textAlign={TextAlign.Center}
              key="scroll-end"
              text="已经到达底部，没有更多了"
              fontSize={12}
              color={currentTheme.text.primary}
            />
          </Padding>
        </Column>
      </Container>
    </ScrollView>
  );
};

export function runApp(runtime: Runtime, width: number, height: number, theme: ThemePalette) {
  runtime.render(<WidgetGalleryDemo width={width} height={height} theme={theme} />);
}
