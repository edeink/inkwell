import { EyeInvisibleOutlined, InfoCircleOutlined, LockOutlined } from '@ant-design/icons';
import { Button, ColorPicker, Input, InputNumber, Popover, Select, Space, Tooltip } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';

import { isHiddenKey, isProtectedKey } from '../../helper/config';
import { ObjectEditor } from '../object-editor';

import styles from './index.module.less';

/**
 * PropsEditor
 * 功能：基于组件数据渲染属性编辑表单，支持受保护属性提示与禁用
 * 参数：widget - 目标组件；onChange - 应用更新后的回调
 * 返回：无（通过父组件控制实际应用）
 */
import type { Widget } from '../../../core/base';

const enumOptionsMap: Record<string, string[]> = {
  cursor: [
    'auto',
    'default',
    'pointer',
    'move',
    'text',
    'not-allowed',
    'grab',
    'grabbing',
    'crosshair',
    'zoom-in',
    'zoom-out',
  ],
  display: ['block', 'inline', 'inline-block', 'flex', 'grid', 'none'],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  overflow: ['visible', 'hidden', 'scroll', 'auto'],
  textAlign: ['left', 'center', 'right', 'justify'],
  flexDirection: ['row', 'row-reverse', 'column', 'column-reverse'],
  justifyContent: [
    'flex-start',
    'center',
    'flex-end',
    'space-between',
    'space-around',
    'space-evenly',
  ],
  alignItems: ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'],
};

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'number' && Number.isFinite(x));
}

export function PropsEditor({ widget, onChange }: { widget: Widget | null; onChange: () => void }) {
  const [local, setLocal] = useState<Record<string, unknown>>(widget ? { ...widget.data } : {});

  useEffect(() => {
    setLocal(widget ? { ...widget.data } : {});
  }, [widget]);

  function updateField(path: string, value: unknown) {
    const next: Record<string, unknown> = { ...local };
    const parts = path.split('.');
    let obj: Record<string, unknown> = next;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      obj =
        (obj[key] as Record<string, unknown> | undefined) ??
        (obj[key] = {} as Record<string, unknown>);
    }
    obj[parts[parts.length - 1]] = value as unknown;
    setLocal(next);
  }

  function apply() {
    if (!widget) {
      return;
    }
    widget.data = { ...widget.data, ...local } as typeof widget.data;
    widget.createElement(widget.data as typeof widget.data);
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
          <div className={styles.emptyDesc}>在左侧 Tree 中选择节点后，这里会展示可编辑属性。</div>
          <div className={styles.emptySteps}>
            <div className={styles.emptyStep}>点击左侧 Tree 节点进行选中</div>
            <div className={styles.emptyStep}>或开启顶部拾取，在画布上点击目标节点</div>
          </div>
        </div>
      </div>
    );
  }
  const allEntries = Object.entries(local).filter(([k]) => k !== 'type' && k !== 'children');
  const hiddenEntries = allEntries.filter(([k]) => isHiddenKey(k));
  const displayEntries = allEntries.filter(([k]) => !isHiddenKey(k));
  const isCallbackKey = (k: string) => /^on[A-Z]/.test(k);
  const callbackEntries = displayEntries.filter(([k]) => isCallbackKey(k));
  const generalKeySet = new Set<string>(['key']);
  const generalEntries = displayEntries.filter(([k]) => !isCallbackKey(k) && generalKeySet.has(k));
  const widgetEntries = displayEntries.filter(([k]) => !isCallbackKey(k) && !generalKeySet.has(k));
  const objectWidgetEntries = widgetEntries.filter(
    ([, v]) => v && typeof v === 'object' && !Array.isArray(v),
  );
  const primitiveWidgetEntries = widgetEntries.filter(
    ([, v]) => !(v && typeof v === 'object' && !Array.isArray(v)),
  );

  const hasNested = objectWidgetEntries.length > 0;

  const renderNumberArrayEditor = (k: string, v: number[]) => (
    <div className={styles.arrayEditor}>
      <span className={styles.arrayBracket}>[</span>
      <Space size={4} wrap={false}>
        {v.map((n, idx) => (
          <span key={`${k}-${idx}`} className={styles.arrayItem}>
            <InputNumber
              size="small"
              value={n}
              onChange={(num) => {
                const next = [...v];
                next[idx] = Number(num ?? 0);
                updateField(k, next);
              }}
              disabled={isProtectedKey(k)}
            />
            {idx < v.length - 1 && <span className={styles.arrayComma}>,</span>}
          </span>
        ))}
      </Space>
      <span className={styles.arrayBracket}>]</span>
    </div>
  );

  const renderEnumSelect = (k: string, v: unknown) => {
    const options = enumOptionsMap[k];
    if (!options) {
      return null;
    }
    const valueStr = typeof v === 'string' ? v : undefined;
    return (
      <Select
        className={styles.formInput}
        size="small"
        value={valueStr}
        placeholder="请选择"
        options={options.map((x) => ({ label: x, value: x }))}
        onChange={(val) => updateField(k, val)}
        disabled={isProtectedKey(k)}
        getPopupContainer={(trigger) =>
          (trigger.closest('.ink-devtools-panel') as HTMLElement) || document.body
        }
      />
    );
  };

  const renderPrimitiveRow = (k: string, v: unknown) => (
    <div key={k} className={styles.formRow}>
      <div className={styles.formLeft}>
        <label className={styles.formLabel}>
          {k}
          {isProtectedKey(k) && (
            <Tooltip title={`${k}（受保护，禁止编辑）`}>
              <LockOutlined />
            </Tooltip>
          )}
        </label>
      </div>
      <div className={styles.formRight}>
        {(() => {
          if (typeof v === 'number') {
            return (
              <InputNumber
                className={styles.formInput}
                size="small"
                value={Number(v)}
                onChange={(num) => updateField(k, Number(num ?? 0))}
                disabled={isProtectedKey(k)}
              />
            );
          }
          if (isNumberArray(v)) {
            return renderNumberArrayEditor(k, v);
          }
          const enumSelect = renderEnumSelect(k, v);
          if (enumSelect) {
            return enumSelect;
          }
          const valStr = String(v ?? '');
          const colorSuffix = (
            <Space>
              <span className={styles.colorPickerWrap}>
                <ColorPicker
                  value={valStr}
                  size="small"
                  showText={false}
                  onChangeComplete={(c: { toHexString: () => string }) =>
                    updateField(k, c.toHexString())
                  }
                  getPopupContainer={(trigger) =>
                    (trigger.closest('.ink-devtools-panel') as HTMLElement) || document.body
                  }
                />
              </span>
            </Space>
          );
          const isCol =
            /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(valStr.toLowerCase()) ||
            /^(rgb|rgba|hsl)\s*\(/.test(valStr.toLowerCase());
          return (
            <Input
              className={styles.formInput}
              size="small"
              value={valStr}
              disabled={isProtectedKey(k)}
              onChange={(e) => updateField(k, e.target.value)}
              suffix={isCol ? colorSuffix : undefined}
            />
          );
        })()}
      </div>
    </div>
  );

  const renderObjectBlock = (k: string, v: Record<string, unknown>) => (
    <div key={k} className={styles.objectGroup}>
      <div className={styles.objectTitle}>{k}</div>
      <ObjectEditor value={v} onChange={(nv) => updateField(k, nv)} />
    </div>
  );

  const renderGroup = (title: string, children: ReactNode) => (
    <div className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      <div className={styles.groupBody}>{children}</div>
    </div>
  );
  return (
    <div
      className={[styles.propsEditor, hasNested ? styles.equalGrid : styles.ratioGrid].join(' ')}
    >
      {(() => {
        const p = widget.getAbsolutePosition();
        const s = widget.renderObject.size;
        return (
          <>
            <div className={styles.readonlyGroup}>
              <div className={styles.readonlyItem}>
                <span className={styles.readonlyLabel}>x</span>
                <span className={styles.readonlyValue}>{Math.round(p.dx)}</span>
              </div>
              <div className={styles.readonlyItem}>
                <span className={styles.readonlyLabel}>y</span>
                <span className={styles.readonlyValue}>{Math.round(p.dy)}</span>
              </div>
            </div>
            <div className={styles.readonlyGroup}>
              <div className={styles.readonlyItem}>
                <span className={styles.readonlyLabel}>w</span>
                <span className={styles.readonlyValue}>{Math.round(s.width)}</span>
              </div>
              <div className={styles.readonlyItem}>
                <span className={styles.readonlyLabel}>h</span>
                <span className={styles.readonlyValue}>{Math.round(s.height)}</span>
              </div>
            </div>
          </>
        );
      })()}
      {hiddenEntries.length > 0 && (
        <div className={styles.hiddenHintRow}>
          <Popover
            trigger="click"
            placement="bottom"
            overlayClassName={styles.hiddenPopoverOverlay}
            getPopupContainer={(trigger) =>
              (trigger.closest('.ink-devtools-panel') as HTMLElement) || document.body
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
      {(generalEntries.length > 0 ||
        primitiveWidgetEntries.length > 0 ||
        objectWidgetEntries.length > 0) && (
        <>
          {generalEntries.length > 0 &&
            renderGroup(
              '通用属性',
              generalEntries.map(([k, v]) => renderPrimitiveRow(k, v)),
            )}
          {(objectWidgetEntries.length > 0 || primitiveWidgetEntries.length > 0) &&
            renderGroup(
              '组件属性',
              <>
                {objectWidgetEntries.map(([k, v]) =>
                  renderObjectBlock(k, v as Record<string, unknown>),
                )}
                {primitiveWidgetEntries.map(([k, v]) => renderPrimitiveRow(k, v))}
              </>,
            )}
        </>
      )}
      {callbackEntries.length > 0 &&
        renderGroup(
          '事件',
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
          </div>,
        )}
      <div className={styles.formActions}>
        <Button
          type="primary"
          size="small"
          onClick={(e) => {
            try {
              e.stopPropagation();
            } catch {}
            apply();
          }}
        >
          应用
        </Button>
      </div>
    </div>
  );
}
