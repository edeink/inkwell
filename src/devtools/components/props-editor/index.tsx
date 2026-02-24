/**
 * Devtools 属性编辑器
 *
 * 渲染组件属性与状态编辑面板。
 * 注意事项：依赖 Widget 实例的 data/state 结构。
 * 潜在副作用：可能调用 widget.createElement 与 setState。
 */
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useEffect } from 'react';

import {
  DEVTOOLS_CSS,
  DEVTOOLS_OBJECT_EDITOR_TEXT,
  DEVTOOLS_PLACEMENT,
  DEVTOOLS_PROP_KEYS,
  DEVTOOLS_PROPS_EDITOR_TEXT,
  DEVTOOLS_TOOLTIP,
  DEVTOOLS_TRIGGER,
  DEVTOOLS_WIDGET_INFO_KEYS,
  formatHiddenInternalProps,
} from '../../constants';
import { isHiddenKey, isProtectedKey } from '../../helper/config';
import { ObjectEditor } from '../object-editor';

import { Group } from './group';
import styles from './index.module.less';
import { ReadonlyRows } from './readonly-rows';
import { Section } from './section';

import type { Widget } from '../../../core/base';

import { Button, Input, Popover, Tabs, Tooltip } from '@/ui';
import { InfoCircleOutlined, InspectOutlined, SyncOutlined, UserOutlined } from '@/ui/icons';

/**
 * PropsEditor
 *
 * @param props 属性编辑器参数
 * @returns React 元素
 * @remarks
 * 注意事项：会直接修改 widget 实例数据并触发重建。
 * 潜在副作用：调用 createElement/setState/markDirty。
 */
export const PropsEditor = observer(function PropsEditor({
  widget,
  onChange,
}: {
  widget: Widget | null;
  onChange: () => void;
}) {
  /**
   * 获取状态快照
   *
   * @param target 目标组件
   * @returns 状态快照对象
   * @remarks
   * 注意事项：仅支持 plain object 状态。
   * 潜在副作用：无。
   */
  const getStateSnapshot = (target: Widget | null) => {
    const state = (target as unknown as { state?: Record<string, unknown> } | null)?.state;
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      return {};
    }
    return { ...state };
  };
  const ui = useLocalObservable(() => ({
    localProps: {} as Record<string, unknown>,
    localState: {} as Record<string, unknown>,
    setFromWidget(target: Widget | null) {
      this.localProps = target ? { ...target.data } : {};
      this.localState = target ? getStateSnapshot(target) : {};
    },
    setLocalProps(next: Record<string, unknown>) {
      this.localProps = next;
    },
    setLocalState(next: Record<string, unknown>) {
      this.localState = next;
    },
  }));

  useEffect(() => {
    ui.setFromWidget(widget);
  }, [ui, widget]);

  /**
   * 应用本地编辑结果
   *
   * @returns void
   * @remarks
   * 注意事项：会触发 widget 重建与状态更新。
   * 潜在副作用：调用 createElement/setState/markDirty。
   */
  function apply() {
    if (!widget) {
      return;
    }
    const nextData = { ...widget.data, ...ui.localProps } as typeof widget.data;
    widget.createElement(nextData);
    const stateTarget = widget as unknown as {
      setState?: (partial: Record<string, unknown>) => void;
      state?: Record<string, unknown>;
    };
    if (stateTarget.setState && Object.keys(ui.localState).length > 0) {
      stateTarget.setState(ui.localState);
    } else if (stateTarget.state && Object.keys(ui.localState).length > 0) {
      stateTarget.state = { ...ui.localState };
      widget.markDirty();
    }
    onChange();
  }

  if (!widget) {
    return (
      <div className={styles.propsEditor}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <InfoCircleOutlined />
          </div>
          <div className={styles.emptyTitle}>{DEVTOOLS_PROPS_EDITOR_TEXT.EMPTY_TITLE}</div>
          <div className={styles.emptyDesc}>{DEVTOOLS_PROPS_EDITOR_TEXT.EMPTY_DESC}</div>
          <div className={styles.emptySteps}>
            <div className={styles.emptyStep}>{DEVTOOLS_PROPS_EDITOR_TEXT.EMPTY_STEP_TREE}</div>
            <div className={styles.emptyStep}>
              {DEVTOOLS_PROPS_EDITOR_TEXT.EMPTY_STEP_OR}
              <InspectOutlined style={{ margin: '0 4px' }} />
              {DEVTOOLS_PROPS_EDITOR_TEXT.EMPTY_STEP_PICK_SUFFIX}
            </div>
          </div>
        </div>
      </div>
    );
  }
  const allEntries = Object.entries(ui.localProps).filter(
    ([k]) =>
      k !== DEVTOOLS_PROP_KEYS.INKWELL_TYPE &&
      k !== DEVTOOLS_PROP_KEYS.CHILDREN &&
      k !== DEVTOOLS_PROP_KEYS.STATE,
  );
  const hiddenEntries = allEntries.filter(([k]) => isHiddenKey(k));
  const displayEntries = allEntries.filter(([k]) => !isHiddenKey(k));
  const isCallbackKey = (k: string) => /^on[A-Z]/.test(k);
  const callbackEntries = displayEntries.filter(([k]) => isCallbackKey(k));

  const stateEntries = Object.entries(ui.localState);

  // 过滤出用于 ObjectEditor 编辑的属性 (排除 callbacks 和 children/state/hidden)
  // 注意：ObjectEditor 内部会处理 hiddenKeys，但我们在这里为了避免混淆，
  // 且保持 callback 分离，我们先手动过滤。
  // 实际上 ObjectEditor 接受 value，我们传递过滤后的对象给它。
  // 但是 localProps 包含所有。
  const isPropEditable = (k: string) =>
    k !== DEVTOOLS_PROP_KEYS.INKWELL_TYPE &&
    k !== DEVTOOLS_PROP_KEYS.CHILDREN &&
    k !== DEVTOOLS_PROP_KEYS.STATE &&
    !isCallbackKey(k);

  const editableProps = Object.fromEntries(
    Object.entries(ui.localProps).filter(([k]) => isPropEditable(k)),
  );

  const onPropsChange = (newEditableProps: Record<string, unknown>) => {
    // Merge back: keep non-editable props from localProps, add new editable props
    const nonEditableProps = Object.fromEntries(
      Object.entries(ui.localProps).filter(([k]) => !isPropEditable(k)),
    );
    ui.setLocalProps({ ...nonEditableProps, ...newEditableProps });
  };

  const onStateChange = (newState: Record<string, unknown>) => {
    ui.setLocalState(newState);
  };

  // 锁定属性：key 和受保护属性
  const lockedPropKeys = Object.keys(editableProps).filter(
    (k) => k === DEVTOOLS_PROP_KEYS.KEY || isProtectedKey(k),
  );

  const renderDebugTab = () => {
    const p = widget.getAbsolutePosition();
    const s = widget.renderObject.size;
    const c = widget.renderObject.constraints;
    const fmt = (n: number) => (Number.isFinite(n) ? String(Math.round(n)) : String(n));
    const isAutoKey = widget.data.key == null || widget.data.key === '';
    const keyValue = (
      <span className={styles.keyValue}>
        <span className={styles.keyValueText}>{String(widget.key)}</span>
        <Tooltip title={isAutoKey ? DEVTOOLS_TOOLTIP.KEY_AUTO : DEVTOOLS_TOOLTIP.KEY_USER}>
          <span className={styles.keyIcon}>{isAutoKey ? <SyncOutlined /> : <UserOutlined />}</span>
        </Tooltip>
      </span>
    );
    return (
      <div className={styles.tabBody}>
        <div className={styles.tabScroll}>
          <Group title={DEVTOOLS_PROPS_EDITOR_TEXT.GROUP_WIDGET_INFO}>
            <ReadonlyRows
              items={[
                {
                  key: DEVTOOLS_WIDGET_INFO_KEYS.TYPE,
                  label: DEVTOOLS_WIDGET_INFO_KEYS.TYPE,
                  value: widget.type,
                },
                {
                  key: DEVTOOLS_PROP_KEYS.KEY,
                  label: DEVTOOLS_PROP_KEYS.KEY,
                  value: keyValue,
                },
              ]}
            />
          </Group>
          <Group title={DEVTOOLS_PROPS_EDITOR_TEXT.GROUP_RENDER_OBJECT}>
            <ReadonlyRows
              items={[
                { key: 'x', label: 'x', value: fmt(p.dx) },
                { key: 'y', label: 'y', value: fmt(p.dy) },
                { key: 'w', label: 'w', value: fmt(s.width) },
                { key: 'h', label: 'h', value: fmt(s.height) },
              ]}
            />
          </Group>
          {c && (
            <Group title={DEVTOOLS_PROPS_EDITOR_TEXT.GROUP_CONSTRAINTS}>
              <ReadonlyRows
                items={[
                  { key: 'minW', label: 'minW', value: fmt(c.minWidth) },
                  { key: 'maxW', label: 'maxW', value: fmt(c.maxWidth) },
                  { key: 'minH', label: 'minH', value: fmt(c.minHeight) },
                  { key: 'maxH', label: 'maxH', value: fmt(c.maxHeight) },
                ]}
              />
            </Group>
          )}
          <Group title={DEVTOOLS_PROPS_EDITOR_TEXT.GROUP_MISC}>
            <ReadonlyRows
              items={[
                { key: 'depth', label: 'depth', value: String(widget.depth) },
                { key: 'zIndex', label: 'zIndex', value: String(widget.zIndex) },
                { key: 'mounted', label: 'mounted', value: String(widget.isMounted) },
                {
                  key: 'repaintBoundary',
                  label: 'repaintBoundary',
                  value: String(widget.isRepaintBoundary),
                },
                {
                  key: 'relayoutBoundary',
                  label: 'relayoutBoundary',
                  value: String(widget.isRelayoutBoundary),
                },
                { key: 'positioned', label: 'positioned', value: String(widget.isPositioned) },
                { key: 'layoutDirty', label: 'layoutDirty', value: String(widget.isLayoutDirty()) },
                { key: 'paintDirty', label: 'paintDirty', value: String(widget.isPaintDirty()) },
              ]}
            />
          </Group>
          {hiddenEntries.length > 0 && (
            <div className={styles.hiddenHintRow}>
              <Popover
                trigger={DEVTOOLS_TRIGGER.CLICK}
                placement={DEVTOOLS_PLACEMENT.BOTTOM}
                overlayClassName={styles.hiddenPopoverOverlay}
                getPopupContainer={(trigger) =>
                  (trigger?.closest?.(DEVTOOLS_CSS.PANEL_SELECTOR) as HTMLElement | null) ??
                  document.body
                }
                content={
                  <div className={styles.hiddenPopover}>
                    <div className={styles.hiddenPopoverHeader}>
                      <InspectOutlined />
                      <span>{DEVTOOLS_OBJECT_EDITOR_TEXT.HIDDEN_PROPS_TITLE}</span>
                      <span className={styles.hiddenPopoverCount}>({hiddenEntries.length})</span>
                    </div>
                    <div className={styles.hiddenPopoverList}>
                      {hiddenEntries.map(([k]) => (
                        <div key={k} className={styles.hiddenItem}>
                          {k}
                        </div>
                      ))}
                    </div>
                  </div>
                }
              >
                <Button
                  size="small"
                  type="text"
                  className={styles.hiddenHintBtn}
                  icon={<InspectOutlined />}
                >
                  {formatHiddenInternalProps(hiddenEntries.length)}
                </Button>
              </Popover>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEventTab = () => {
    const eventNames = callbackEntries.map(([k]) => k);
    return (
      <div className={styles.tabBody}>
        <div className={styles.tabScroll}>
          <Group title="事件属性">
            <ReadonlyRows
              items={[
                { key: 'pointerEvent', label: 'pointerEvent', value: String(widget.pointerEvent) },
                { key: 'cursor', label: 'cursor', value: String(widget.cursor ?? '-') },
              ]}
            />
          </Group>
          <Group title="事件绑定">
            <>
              <ReadonlyRows
                items={[
                  { key: 'callbacks', label: '回调数', value: String(callbackEntries.length) },
                ]}
              />
              <div className={styles.eventList}>
                {eventNames.length > 0 ? (
                  eventNames.map((name) => (
                    <span key={name} className={styles.eventItem}>
                      {name}
                    </span>
                  ))
                ) : (
                  <span className={styles.eventEmpty}>暂无事件绑定</span>
                )}
              </div>
            </>
          </Group>
          {callbackEntries.length > 0 && (
            <Group title="回调详情">
              <div className={styles.callbackGroup}>
                {callbackEntries.map(([k, v]) => (
                  <div key={k} className={styles.formRow}>
                    <div className={styles.formLeft}>
                      <label className={styles.formLabel}>{k}</label>
                    </div>
                    <div className={styles.formRight}>
                      <Input
                        className={styles.formInput}
                        size="small"
                        suffix={<span className={styles.callbackBadge}>[回调]</span>}
                        value={typeof v === 'function' ? '[Function]' : String(v ?? '')}
                        disabled
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Group>
          )}
        </div>
      </div>
    );
  };

  const renderEditableTab = () => (
    <div className={styles.tabBody}>
      <div className={styles.tabScroll}>
        {stateEntries.length > 0 && (
          <Section
            title="State"
            titleClassName={styles.sectionTitlePrimary}
            bodyClassName={styles.singleColumnGroup}
          >
            <ObjectEditor value={ui.localState} onChange={onStateChange} />
          </Section>
        )}
        {Object.keys(editableProps).length > 0 && (
          <Section title="Props" titleClassName={styles.sectionTitlePrimary}>
            <ObjectEditor
              value={editableProps}
              onChange={onPropsChange}
              lockedKeys={lockedPropKeys}
            />
          </Section>
        )}
      </div>
      <div className={styles.formActions}>
        <Button
          type="primary"
          size="small"
          onClick={(e) => {
            e.stopPropagation?.();
            apply();
          }}
        >
          应用
        </Button>
      </div>
    </div>
  );

  return (
    <div className={styles.propsEditor}>
      <Tabs
        className={styles.tabs}
        size="small"
        tabBarPadding={'8px 4px'}
        items={[
          { key: 'editable', label: '状态', children: renderEditableTab() },
          { key: 'debug', label: '调试信息', children: renderDebugTab() },
          { key: 'events', label: '事件', children: renderEventTab() },
        ]}
      />
    </div>
  );
});
