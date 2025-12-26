/** @jsxImportSource @/utils/compiler */
import { Colors } from '../../constants/colors';
import { DemoCard } from '../demo-card';
import { Section } from '../section';

import {
  Center,
  ClipRect,
  Column,
  Container,
  Expanded,
  Image,
  ImageFit,
  Positioned,
  Row,
  SizedBox,
  Stack,
  Text,
  Wrap,
} from '@/core';
import { CrossAxisAlignment, MainAxisAlignment, MainAxisSize } from '@/core/flex/type';
import { ScrollView } from '@/core/viewport/scroll-view';

/**
 * 演示页面的主入口
 * 展示了核心组件的组合使用方式，包括布局、定位、交互等
 */
export const WidgetGalleryDemo = ({ width, height }: { width?: number; height?: number }) => (
  <ScrollView key="root-scroll-view" width={width} height={height}>
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
            color={Colors.Text.Title}
            fontWeight="bold"
          />
          <Text
            key="demo-subtitle"
            text="基于 Canvas 的高性能 UI 渲染框架演示"
            fontSize={16}
            color={Colors.Text.Light}
          />
        </Column>

        {/* 1. 基础布局组件 (Container & Padding) */}
        <Section title="1. 基础容器 (Container & Padding)">
          <Row key="container-examples" spacing={20} mainAxisSize={MainAxisSize.Min}>
            {/* 基础容器 */}
            <DemoCard title="基础样式">
              <Container
                key="basic-container"
                width={120}
                height={80}
                color={Colors.Primary}
                padding={12}
              >
                <Center>
                  <Text
                    key="basic-text"
                    text="盒子"
                    fontSize={16}
                    color={Colors.Text.White}
                    fontWeight="bold"
                  />
                </Center>
              </Container>
            </DemoCard>

            {/* 圆角容器 */}
            <DemoCard title="圆角与边框">
              <Container
                key="rounded-container"
                width={120}
                height={80}
                color={Colors.Secondary}
                borderRadius={12}
                border={{ width: 2, color: Colors.Warning }}
              >
                <Center>
                  <Text
                    key="rounded-text"
                    text="圆角"
                    fontSize={16}
                    color={Colors.Text.White}
                    fontWeight="bold"
                  />
                </Center>
              </Container>
            </DemoCard>
          </Row>
        </Section>

        {/* 2. 弹性布局 (Row & Column) */}
        <Section title="2. 弹性布局 (Row & Column)">
          <Column key="flex-examples" spacing={16} mainAxisSize={MainAxisSize.Min}>
            <DemoCard title="水平布局: 两端对齐" width={400}>
              <Container
                key="row-container"
                width={360}
                height={60}
                color={Colors.Background.Base}
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
                      color={Colors.Primary}
                      borderRadius={4}
                    >
                      <Center>
                        <Text key={`t-${i}`} text={`${i}`} color={Colors.Text.White} />
                      </Center>
                    </Container>
                  ))}
                </Row>
              </Container>
            </DemoCard>

            <DemoCard title="垂直布局: 起始对齐" width={400}>
              <Container
                key="col-container"
                width={360}
                height={120}
                color={Colors.Background.Base}
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
                      color={Colors.Secondary}
                      borderRadius={4}
                    >
                      <Center>
                        <Text key={`tc-${i}`} text={`项目 ${i}`} color={Colors.Text.White} />
                      </Center>
                    </Container>
                  ))}
                </Column>
              </Container>
            </DemoCard>
          </Column>
        </Section>

        {/* 3. 层叠布局 (Stack & Positioned) */}
        <Section title="3. 层叠布局 (Stack & Positioned)">
          <DemoCard title="头像角标示例">
            <Container
              key="stack-container"
              width={100}
              height={100}
              color={Colors.Background.Base}
              borderRadius={8}
            >
              <Stack key="stack-demo">
                {/* 底部头像 */}
                <Container
                  key="avatar"
                  width={80}
                  height={80}
                  color={Colors.Primary}
                  borderRadius={40}
                  margin={{ left: 10, top: 10 }}
                />
                {/* 右上角徽标 */}
                <Positioned key="badge" right={5} top={5}>
                  <Container
                    key="badge-container"
                    width={24}
                    height={24}
                    color={Colors.Error}
                    borderRadius={12}
                    border={{ width: 2, color: Colors.Text.White }}
                  >
                    <Center>
                      <Text
                        key="badge-text"
                        text="1"
                        fontSize={12}
                        color={Colors.Text.White}
                        fontWeight="bold"
                      />
                    </Center>
                  </Container>
                </Positioned>
              </Stack>
            </Container>
          </DemoCard>
        </Section>

        {/* 4. 裁剪 (ClipRect) */}
        <Section title="4. 区域裁剪 (ClipRect)">
          <DemoCard title="溢出隐藏">
            <Container
              key="clip-wrapper"
              width={100}
              height={100}
              color={Colors.Background.Base}
              borderRadius={8}
            >
              <ClipRect key="clip-demo">
                <Container
                  key="clipped-content"
                  width={150}
                  height={150}
                  color={Colors.Warning}
                  borderRadius={75}
                  margin={{ left: 25, top: 25 }} // 将圆形中心移到容器中心，部分被裁剪
                />
              </ClipRect>
            </Container>
          </DemoCard>
        </Section>

        {/* 5. 自动伸缩 (Expanded) */}
        <Section title="5. 自动伸缩 (Expanded)">
          <DemoCard title="填充剩余空间" width={400}>
            <Container
              key="expanded-container"
              width={360}
              height={50}
              color={Colors.Background.Base}
              borderRadius={4}
            >
              <Row key="expanded-row" mainAxisSize={MainAxisSize.Max}>
                <Container key="fixed-left" width={60} height={50} color={Colors.Primary} />
                <Expanded key="expanded-middle" flex={{ flex: 1 }}>
                  <Container key="flex-content" height={50} color={Colors.Secondary}>
                    <Center>
                      <Text key="flex-text" text="Flex: 1" color={Colors.Text.White} />
                    </Center>
                  </Container>
                </Expanded>
                <Container key="fixed-right" width={60} height={50} color={Colors.Primary} />
              </Row>
            </Container>
          </DemoCard>
        </Section>

        {/* 6. 流式布局 (Wrap) */}
        <Section title="6. 流式布局 (Wrap)">
          <DemoCard title="自动换行布局">
            <Container
              key="wrap-container"
              width={300}
              color={Colors.Background.Base}
              padding={10}
              borderRadius={4}
            >
              <Wrap key="wrap-demo" spacing={10} runSpacing={10}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Container
                    key={`wrap-item-${i}`}
                    width={80}
                    height={40}
                    color={Colors.Primary}
                    borderRadius={4}
                  >
                    <Center>
                      <Text
                        key={`wrap-text-${i}`}
                        text={`项目 ${i}`}
                        color={Colors.Text.White}
                        fontSize={12}
                      />
                    </Center>
                  </Container>
                ))}
              </Wrap>
            </Container>
          </DemoCard>
        </Section>

        {/* 7. 图片组件 (Image) */}
        <Section title="7. 图片展示 (Image)">
          <DemoCard title="图片填充模式">
            <Row key="image-row" spacing={20} mainAxisSize={MainAxisSize.Min}>
              <Column key="image-col-contain" spacing={8} mainAxisSize={MainAxisSize.Min}>
                <Container
                  key="img-container-1"
                  width={100}
                  height={100}
                  border={{ width: 1, color: Colors.Border }}
                >
                  <Image
                    key="img-contain"
                    type="image"
                    src="/assets/logo.png"
                    fit={ImageFit.Contain}
                  />
                </Container>
                <Text key="txt-contain" text="Contain" fontSize={12} color={Colors.Text.Body} />
              </Column>
              <Column key="image-col-cover" spacing={8} mainAxisSize={MainAxisSize.Min}>
                <Container
                  key="img-container-2"
                  width={100}
                  height={100}
                  border={{ width: 1, color: Colors.Border }}
                >
                  <Image key="img-cover" type="image" src="/assets/logo.png" fit={ImageFit.Cover} />
                </Container>
                <Text key="txt-cover" text="Cover" fontSize={12} color={Colors.Text.Body} />
              </Column>
            </Row>
          </DemoCard>
        </Section>

        {/* 8. 间距组件 (SizedBox) */}
        <Section title="8. 间距组件 (SizedBox)">
          <DemoCard title="固定间距">
            <Row key="sizedbox-row" mainAxisSize={MainAxisSize.Min}>
              <Container key="box1" width={50} height={50} color={Colors.Primary} />
              <SizedBox key="spacer" width={30} />
              <Container key="box2" width={50} height={50} color={Colors.Secondary} />
            </Row>
          </DemoCard>
        </Section>
        {/* 9. 滚动视图 (ScrollView) */}
        <Section title="9. 滚动视图 (ScrollView)">
          <DemoCard title="可滚动内容">
            <Container
              key="scroll-container-wrapper"
              width={200}
              height={150}
              border={{ width: 1, color: Colors.Border }}
            >
              <ScrollView key="inner-scroll-view" width={200} height={150}>
                <Column key="scroll-col" spacing={10} padding={10} mainAxisSize={MainAxisSize.Min}>
                  <Text
                    key="scroll-desc"
                    text="ScrollView 是 ClipRect 和 Expanded 的替代方案，用于处理溢出内容。"
                    fontSize={12}
                    color={Colors.Text.Body}
                  />
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Container
                      key={`scroll-item-${i}`}
                      width={160}
                      height={30}
                      color={i % 2 === 0 ? Colors.Primary : Colors.Secondary}
                      borderRadius={4}
                    >
                      <Center>
                        <Text
                          key={`scroll-text-${i}`}
                          text={`滚动项目 ${i}`}
                          color={Colors.Text.White}
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

        {/* 10. 交互演示 (Interaction) */}
        <Section title="10. 交互演示 (Interaction)">
          <DemoCard title="点击与光标">
            <Row key="interaction-row" spacing={20} mainAxisSize={MainAxisSize.Min}>
              <Container
                key="btn-click"
                width={100}
                height={40}
                color={Colors.Primary}
                borderRadius={4}
                cursor="pointer"
                onClick={() => console.log('点击了按钮')}
              >
                <Center>
                  <Text key="btn-text" text="点击我" color={Colors.Text.White} />
                </Center>
              </Container>

              <Container
                key="btn-hover"
                width={100}
                height={40}
                color={Colors.Secondary}
                borderRadius={4}
                cursor="not-allowed"
              >
                <Center>
                  <Text key="hover-text" text="禁止点击" color={Colors.Text.White} />
                </Center>
              </Container>
            </Row>
          </DemoCard>
        </Section>
      </Column>
    </Container>
  </ScrollView>
);
