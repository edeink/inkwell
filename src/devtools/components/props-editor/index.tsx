import { useEffect, useState } from 'react';

import { isHiddenKey, isProtectedKey } from '../../helper/config';
import { ObjectEditor } from '../object-editor';

import { Group } from './group';
import styles from './index.module.less';
import { ReadonlyRows } from './readonly-rows';
import { Section } from './section';

/**
 * PropsEditor
 * 功能：基于组件数据渲染属性编辑表单，支持受保护属性提示与禁用
 * 参数：widget - 目标组件；onChange - 应用更新后的回调
 * 返回：无（通过父组件控制实际应用）
 */
import type { Widget } from '../../../core/base';

import { Button, Input, Popover, Tabs, Tooltip } from '@/ui';
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  SyncOutlined,
  UserOutlined,
} from '@/ui/icons';

export function PropsEditor({ widget, onChange }: { widget: Widget | null; onChange: () => void }) {
  const getStateSnapshot = (target: Widget | null) => {
    const state = (target as unknown as { state?: Record<string, unknown> } | null)?.state;
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      return {};
    }
    return { ...state };
  };
  const [localProps, setLocalProps] = useState<Record<string, unknown>>(
    widget ? { ...widget.data } : {},
  );
  const [localState, setLocalState] = useState<Record<string, unknown>>(
    widget ? getStateSnapshot(widget) : {},
  );

  useEffect(() => {
    setLocalProps(widget ? { ...widget.data } : {});
    setLocalState(widget ? getStateSnapshot(widget) : {});
  }, [widget]);

  function apply() {
    if (!widget) {
      return;
    }
    const nextData = { ...widget.data, ...localProps } as typeof widget.data;
    widget.createElement(nextData);
    const stateTarget = widget as unknown as {
      setState?: (partial: Record<string, unknown>) => void;
      state?: Record<string, unknown>;
    };
    if (stateTarget.setState && Object.keys(localState).length > 0) {
      stateTarget.setState(localState);
    } else if (stateTarget.state && Object.keys(localState).length > 0) {
      stateTarget.state = { ...localState };
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
          <div className={styles.emptyTitle}>未选择节点</div>
          <div className={styles.emptyDesc}>选择节点后展示可编辑属性</div>
          <div className={styles.emptySteps}>
            <div className={styles.emptyStep}>点击 Tree 节点</div>
            <div className={styles.emptyStep}>
              或点击顶部 <EyeOutlined style={{ padding: '0 4px' }} /> 在画布上选取
            </div>
          </div>
        </div>
      </div>
    );
  }
  const allEntries = Object.entries(localProps).filter(
    ([k]) => k !== '__inkwellType' && k !== 'children' && k !== 'state',
  );
  const hiddenEntries = allEntries.filter(([k]) => isHiddenKey(k));
  const displayEntries = allEntries.filter(([k]) => !isHiddenKey(k));
  const isCallbackKey = (k: string) => /^on[A-Z]/.test(k);
  const callbackEntries = displayEntries.filter(([k]) => isCallbackKey(k));

  const stateEntries = Object.entries(localState);

  // 过滤出用于 ObjectEditor 编辑的属性 (排除 callbacks 和 children/state/hidden)
  // 注意：ObjectEditor 内部会处理 hiddenKeys，但我们在这里为了避免混淆，
  // 且保持 callback 分离，我们先手动过滤。
  // 实际上 ObjectEditor 接受 value，我们传递过滤后的对象给它。
  // 但是 localProps 包含所有。
  const isPropEditable = (k: string) =>
    k !== '__inkwellType' && k !== 'children' && k !== 'state' && !isCallbackKey(k);

  const editableProps = Object.fromEntries(
    Object.entries(localProps).filter(([k]) => isPropEditable(k)),
  );

  const onPropsChange = (newEditableProps: Record<string, unknown>) => {
    // Merge back: keep non-editable props from localProps, add new editable props
    const nonEditableProps = Object.fromEntries(
      Object.entries(localProps).filter(([k]) => !isPropEditable(k)),
    );
    setLocalProps({ ...nonEditableProps, ...newEditableProps });
  };

  const onStateChange = (newState: Record<string, unknown>) => {
    setLocalState(newState);
  };

  // 锁定属性：key 和受保护属性
  const lockedPropKeys = Object.keys(editableProps).filter((k) => k === 'key' || isProtectedKey(k));

  const renderDebugTab = () => {
    const p = widget.getAbsolutePosition();
    const s = widget.renderObject.size;
    const c = widget.renderObject.constraints;
    const fmt = (n: number) => (Number.isFinite(n) ? String(Math.round(n)) : String(n));
    const isAutoKey = widget.data.key == null || widget.data.key === '';
    const keyValue = (
      <span className={styles.keyValue}>
        <span className={styles.keyValueText}>{String(widget.key)}</span>
        <Tooltip title={isAutoKey ? 'Key 由系统自动生成' : 'Key 由用户显式指定'}>
          <span className={styles.keyIcon}>{isAutoKey ? <SyncOutlined /> : <UserOutlined />}</span>
        </Tooltip>
      </span>
    );
    return (
      <div className={styles.tabBody}>
        <div className={styles.tabScroll}>
          <Group title="组件信息">
            <ReadonlyRows
              items={[
                {
                  key: 'type',
                  label: 'type',
                  value: widget.type,
                },
                {
                  key: 'key',
                  label: 'key',
                  value: keyValue,
                },
              ]}
            />
          </Group>
          <Group title="RenderObject">
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
            <Group title="约束">
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
          <Group title="其它信息">
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
                trigger="click"
                placement="bottom"
                overlayClassName={styles.hiddenPopoverOverlay}
                getPopupContainer={(trigger) =>
                  (trigger?.closest?.('.ink-devtools-panel') as HTMLElement | null) ?? document.body
                }
                content={
                  <div className={styles.hiddenPopover}>
                    <div className={styles.hiddenPopoverHeader}>
                      <EyeInvisibleOutlined />
                      <span>内部属性</span>
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
                  icon={<EyeInvisibleOutlined />}
                >
                  已隐藏 {hiddenEntries.length} 个内部属性
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
            <ObjectEditor value={localState} onChange={onStateChange} />
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
}
