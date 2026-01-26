/** @jsxImportSource @/utils/compiler */
import { GlassPanel } from '../glass-panel';
import { GlassSection } from '../glass-section';

import type { ThemePalette } from '@/styles/theme';

import {
  Button,
  Checkbox,
  CheckboxGroup,
  DatePicker,
  Drawer,
  Form,
  FormItem,
  Menu,
  message,
  Modal,
  Pagination,
  Popconfirm,
  RadioGroup,
  Select,
  Table,
  type TableColumn,
} from '@/comp';
import {
  Column,
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  MainAxisSize,
  Padding,
  Row,
  ScrollView,
  SizedBox,
  Stack,
  StatefulWidget,
  Text,
  TextAlign,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';
import { applyAlpha } from '@/core/helper/color';
import { Themes } from '@/styles/theme';

export interface CompGalleryRootProps extends WidgetProps {
  width?: number;
  height?: number;
  theme?: ThemePalette;
}

interface CompGalleryRootState {
  modalOpen: boolean;
  drawerOpen: boolean;
  selectedCity: string | null;
  checkedList: string[];
  radioValue: string;
  pickedDate: Date | null;
  currentPage: number;
  [key: string]: unknown;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export class CompGalleryRoot extends StatefulWidget<CompGalleryRootProps, CompGalleryRootState> {
  protected state: CompGalleryRootState = {
    modalOpen: false,
    drawerOpen: false,
    selectedCity: null,
    checkedList: ['shanghai'],
    radioValue: 'a',
    pickedDate: null,
    currentPage: 1,
  };

  render() {
    const currentTheme = this.props.theme || Themes.light;
    const width = this.props.width && this.props.width > 0 ? this.props.width : 800;
    const height = this.props.height && this.props.height > 0 ? this.props.height : 600;

    const scrollBarTrackColor = applyAlpha(currentTheme.text.primary, 0.06);
    const scrollBarColor = applyAlpha(currentTheme.text.primary, 0.22);
    const scrollBarHoverColor = applyAlpha(currentTheme.text.primary, 0.32);
    const scrollBarActiveColor = applyAlpha(currentTheme.text.primary, 0.44);

    type TableRow = {
      key: string;
      name: string;
      age: number;
      city: string;
      phone: string;
      email: string;
      address: string;
    };

    const tableColumns: ReadonlyArray<TableColumn<TableRow>> = [
      { title: '姓名', key: 'name', dataIndex: 'name', width: 120, fixed: 'left' },
      { title: '年龄', key: 'age', dataIndex: 'age', width: 80 },
      { title: '城市', key: 'city', dataIndex: 'city', width: 120 },
      { title: '电话', key: 'phone', dataIndex: 'phone', width: 160 },
      { title: '邮箱', key: 'email', dataIndex: 'email', width: 220 },
      { title: '地址', key: 'address', dataIndex: 'address', width: 240 },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        render: () => '查看',
      },
    ];

    const tablePageSize = 12;
    const tableTotal = 120;
    const tableStartIndex = (this.state.currentPage - 1) * tablePageSize;
    const tableCount = Math.max(0, Math.min(tablePageSize, tableTotal - tableStartIndex));
    const tableData: TableRow[] = Array.from({ length: tableCount }).map((_, idx) => {
      const n = tableStartIndex + idx;
      return {
        key: String(n + 1),
        name: n % 2 === 0 ? `张三${n + 1}` : `李四${n + 1}`,
        age: 20 + (n % 20),
        city: n % 3 === 0 ? '上海' : n % 3 === 1 ? '北京' : '深圳',
        phone: `138-${String(1000 + n).padStart(4, '0')}-${String(2000 + n).padStart(4, '0')}`,
        email: `user${n + 1}@example.com`,
        address: `某市某区 ${n + 1} 号`,
      };
    });

    const contentW = clamp(Math.min(760, width - 48), 0, 760);

    return (
      <SizedBox key="comp-gallery-stage" width={width} height={height}>
        <Stack allowOverflowPositioned={true}>
          <ScrollView
            key="comp-gallery-scroll"
            width={width}
            height={height}
            scrollBarTrackColor={scrollBarTrackColor}
            scrollBarColor={scrollBarColor}
            scrollBarHoverColor={scrollBarHoverColor}
            scrollBarActiveColor={scrollBarActiveColor}
          >
            <Container
              minWidth={width}
              minHeight={height}
              alignment="center"
              color={currentTheme.background.base}
            >
              <Padding padding={24}>
                <Column
                  key="comp-gallery-root"
                  mainAxisAlignment={MainAxisAlignment.Center}
                  crossAxisAlignment={CrossAxisAlignment.Start}
                  spacing={24}
                  mainAxisSize={MainAxisSize.Max}
                >
                  <Column
                    key="header"
                    spacing={8}
                    mainAxisSize={MainAxisSize.Min}
                    crossAxisAlignment={CrossAxisAlignment.Start}
                  >
                    <Text
                      key="demo-title"
                      text="组件库画廊（src/comp）"
                      fontSize={30}
                      height={36}
                      lineHeight={36}
                      color={currentTheme.text.primary}
                      fontWeight="bold"
                    />
                    <Text
                      key="demo-subtitle"
                      text="以 Liquid Glass 风格展示组件在不同主题下的外观与交互。"
                      fontSize={13}
                      color={currentTheme.text.secondary}
                      lineHeight={18}
                    />
                  </Column>

                  <GlassSection title="1. Button 按钮" theme={currentTheme} width={contentW}>
                    <GlassPanel
                      title="类型与状态"
                      theme={currentTheme}
                      width={contentW}
                      height={120}
                    >
                      <Row
                        spacing={12}
                        mainAxisSize={MainAxisSize.Min}
                        crossAxisAlignment={CrossAxisAlignment.Center}
                      >
                        <Button
                          theme={currentTheme}
                          btnType="default"
                          width={88}
                          onClick={() => message.info('点击默认按钮')}
                        >
                          <Text
                            text="默认"
                            fontSize={14}
                            color={currentTheme.text.primary}
                            textAlignVertical={TextAlignVertical.Center}
                            pointerEvent="none"
                          />
                        </Button>
                        <Button
                          theme={currentTheme}
                          btnType="primary"
                          width={88}
                          onClick={() => message.success('点击主按钮')}
                        >
                          <Text
                            text="主按钮"
                            fontSize={14}
                            color={currentTheme.text.inverse}
                            textAlignVertical={TextAlignVertical.Center}
                            pointerEvent="none"
                          />
                        </Button>
                        <Button
                          theme={currentTheme}
                          danger={true}
                          btnType="primary"
                          width={88}
                          onClick={() => message.error('危险操作')}
                        >
                          <Text
                            text="危险"
                            fontSize={14}
                            color={currentTheme.text.inverse}
                            textAlignVertical={TextAlignVertical.Center}
                            pointerEvent="none"
                          />
                        </Button>
                        <Button theme={currentTheme} disabled={true} btnType="default" width={88}>
                          <Text
                            text="禁用"
                            fontSize={14}
                            color={currentTheme.text.placeholder}
                            textAlignVertical={TextAlignVertical.Center}
                            pointerEvent="none"
                          />
                        </Button>
                      </Row>
                    </GlassPanel>
                  </GlassSection>

                  <GlassSection title="2. Table + Pagination" theme={currentTheme} width={contentW}>
                    <GlassPanel title="基础表格" theme={currentTheme} width={contentW} height={420}>
                      <Column spacing={12} crossAxisAlignment={CrossAxisAlignment.Start}>
                        <Table
                          theme={currentTheme}
                          width={contentW}
                          height={320}
                          columns={tableColumns}
                          dataSource={tableData}
                        />
                        <Row
                          mainAxisAlignment={MainAxisAlignment.End}
                          crossAxisAlignment={CrossAxisAlignment.Center}
                        >
                          <Pagination
                            theme={currentTheme}
                            total={tableTotal}
                            current={this.state.currentPage}
                            onChange={(p) => this.setState({ currentPage: p })}
                          />
                        </Row>
                      </Column>
                    </GlassPanel>
                  </GlassSection>

                  <GlassSection
                    title="3. Form + Select + DatePicker"
                    theme={currentTheme}
                    width={contentW}
                  >
                    <GlassPanel title="表单布局" theme={currentTheme} width={contentW} height={260}>
                      <Form theme={currentTheme} labelWidth={96}>
                        <FormItem
                          theme={currentTheme}
                          label="城市"
                          required={true}
                          help={this.state.selectedCity ? '' : '请选择城市'}
                          validateStatus={this.state.selectedCity ? 'success' : 'error'}
                        >
                          <Select
                            theme={currentTheme}
                            width={240}
                            placeholder="请选择"
                            value={this.state.selectedCity}
                            options={[
                              { label: '上海', value: 'shanghai' },
                              { label: '北京', value: 'beijing' },
                              { label: '深圳', value: 'shenzhen' },
                            ]}
                            onChange={(v) => this.setState({ selectedCity: v })}
                          />
                        </FormItem>
                        <FormItem theme={currentTheme} label="日期">
                          <DatePicker
                            theme={currentTheme}
                            width={240}
                            placeholder="请选择日期"
                            value={this.state.pickedDate}
                            onChange={(d) => this.setState({ pickedDate: d })}
                          />
                        </FormItem>
                      </Form>
                    </GlassPanel>
                  </GlassSection>

                  <GlassSection title="4. Checkbox + Radio" theme={currentTheme} width={contentW}>
                    <GlassPanel title="选择控件" theme={currentTheme} width={contentW} height={220}>
                      <Column spacing={16} crossAxisAlignment={CrossAxisAlignment.Start}>
                        <CheckboxGroup
                          theme={currentTheme}
                          options={[
                            { label: '上海', value: 'shanghai' },
                            { label: '北京', value: 'beijing' },
                            { label: '广州', value: 'guangzhou', disabled: true },
                          ]}
                          value={this.state.checkedList}
                          onChange={(v) => this.setState({ checkedList: v })}
                        />
                        <RadioGroup
                          theme={currentTheme}
                          options={[
                            { label: 'A', value: 'a' },
                            { label: 'B', value: 'b' },
                            { label: 'C', value: 'c' },
                          ]}
                          value={this.state.radioValue}
                          onChange={(v) => this.setState({ radioValue: v })}
                        />
                        <Checkbox theme={currentTheme} label="我已阅读并同意" />
                      </Column>
                    </GlassPanel>
                  </GlassSection>

                  <GlassSection title="5. Menu 导航菜单" theme={currentTheme} width={contentW}>
                    <GlassPanel title="垂直菜单" theme={currentTheme} width={contentW} height={220}>
                      <Menu
                        theme={currentTheme}
                        width={240}
                        items={[
                          { key: 'home', label: '首页' },
                          { key: 'docs', label: '文档' },
                          { key: 'disabled', label: '禁用项', disabled: true },
                        ]}
                        defaultSelectedKeys={['home']}
                        onSelect={(k) => message.info(`选中：${k}`)}
                      />
                    </GlassPanel>
                  </GlassSection>

                  <GlassSection
                    title="6. Modal + Drawer + Message + Popconfirm"
                    theme={currentTheme}
                    width={contentW}
                  >
                    <GlassPanel title="弹层交互" theme={currentTheme} width={contentW} height={140}>
                      <Row
                        spacing={12}
                        mainAxisSize={MainAxisSize.Min}
                        crossAxisAlignment={CrossAxisAlignment.Center}
                      >
                        <Button
                          theme={currentTheme}
                          btnType="primary"
                          onClick={() => this.setState({ modalOpen: true })}
                        >
                          <Text
                            text="打开 Modal"
                            fontSize={14}
                            color={currentTheme.text.inverse}
                            textAlignVertical={TextAlignVertical.Center}
                            pointerEvent="none"
                          />
                        </Button>
                        <Button
                          theme={currentTheme}
                          btnType="default"
                          onClick={() => this.setState({ drawerOpen: true })}
                        >
                          <Text
                            text="打开 Drawer"
                            fontSize={14}
                            color={currentTheme.text.primary}
                            textAlignVertical={TextAlignVertical.Center}
                            pointerEvent="none"
                          />
                        </Button>
                        <Button
                          theme={currentTheme}
                          btnType="default"
                          onClick={() => message.success('操作成功')}
                        >
                          <Text
                            text="Message.success"
                            fontSize={14}
                            color={currentTheme.text.primary}
                            textAlignVertical={TextAlignVertical.Center}
                            pointerEvent="none"
                          />
                        </Button>
                        <Popconfirm
                          theme={currentTheme}
                          title="确认删除？"
                          description="删除后将无法恢复"
                          onConfirm={() => message.success('已删除')}
                          onCancel={() => message.info('已取消')}
                        >
                          <Button theme={currentTheme} btnType="primary" danger={true}>
                            <Text
                              text="删除"
                              fontSize={14}
                              color={currentTheme.text.inverse}
                              textAlignVertical={TextAlignVertical.Center}
                              pointerEvent="none"
                            />
                          </Button>
                        </Popconfirm>
                      </Row>
                    </GlassPanel>
                  </GlassSection>

                  <Padding padding={{ top: 12, bottom: 48 }}>
                    <Text
                      text="以上示例用于展示 src/comp 的交互与布局效果。"
                      fontSize={12}
                      color={currentTheme.text.secondary}
                      textAlign={TextAlign.Center}
                      pointerEvent="none"
                    />
                  </Padding>
                </Column>
              </Padding>
            </Container>
          </ScrollView>

          <Modal
            key="modal"
            theme={currentTheme}
            open={this.state.modalOpen}
            viewportWidth={width}
            viewportHeight={height}
            title="对话框"
            onCancel={() => this.setState({ modalOpen: false })}
            onOk={() => {
              this.setState({ modalOpen: false });
              message.success('已确认');
            }}
          >
            <Text
              text="这是一个基于 InkWell Widget 实现的 Modal。"
              fontSize={14}
              color={currentTheme.text.primary}
              lineHeight={22}
              pointerEvent="none"
            />
          </Modal>

          <Drawer
            key="drawer"
            theme={currentTheme}
            open={this.state.drawerOpen}
            viewportWidth={width}
            viewportHeight={height}
            title="抽屉"
            onClose={() => this.setState({ drawerOpen: false })}
          >
            <Column spacing={12} crossAxisAlignment={CrossAxisAlignment.Start}>
              <Text
                text="这里是抽屉内容区域。"
                fontSize={14}
                color={currentTheme.text.primary}
                pointerEvent="none"
              />
              <Button
                theme={currentTheme}
                btnType="primary"
                onClick={(e: InkwellEvent) => {
                  void e;
                  message.info('抽屉内触发消息');
                }}
              >
                <Text
                  text="触发 Message"
                  fontSize={14}
                  color={currentTheme.text.inverse}
                  textAlignVertical={TextAlignVertical.Center}
                  pointerEvent="none"
                />
              </Button>
            </Column>
          </Drawer>
        </Stack>
      </SizedBox>
    );
  }
}
