import { LockOutlined } from '@ant-design/icons';
import { Button, ColorPicker, Divider, Input, InputNumber, Space, Tooltip } from 'antd';
import { useEffect, useState } from 'react';

import { isProtectedKey } from '../../helper/config';
import { ObjectEditor } from '../object-editor';

import styles from './index.module.less';

/**
 * PropsEditor
 * 功能：基于组件数据渲染属性编辑表单，支持受保护属性提示与禁用
 * 参数：widget - 目标组件；onChange - 应用更新后的回调
 * 返回：无（通过父组件控制实际应用）
 */
import type { Widget } from '../../../core/base';

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
    return <div className={styles.emptyHint}>未选择节点</div>;
  }
  const allEntries = Object.entries(local).filter(([k]) => k !== 'type' && k !== 'children');
  const isCallbackKey = (k: string) => /^on[A-Z]/.test(k);
  const callbackEntries = allEntries.filter(([k]) => isCallbackKey(k));
  const entries = allEntries.filter(([k]) => !isCallbackKey(k));

  const hasNested = entries.some(([, v]) => v && typeof v === 'object' && !Array.isArray(v));
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
      {entries.length && <Divider />}
      {entries.map(([k, v]) => (
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
            {v && typeof v === 'object' && !Array.isArray(v) ? (
              <ObjectEditor
                value={v as Record<string, unknown>}
                onChange={(nv) => updateField(k, nv)}
              />
            ) : (
              (() => {
                if (typeof v === 'number') {
                  return (
                    <InputNumber
                      className={styles.formInput}
                      value={Number(v)}
                      onChange={(num) => updateField(k, Number(num ?? 0))}
                      disabled={isProtectedKey(k)}
                    />
                  );
                }
                const valStr = String(v ?? '');
                const colorSuffix = (
                  <Space>
                    <ColorPicker
                      value={valStr}
                      onChangeComplete={(c: { toHexString: () => string }) =>
                        updateField(k, c.toHexString())
                      }
                      getPopupContainer={(trigger) =>
                        (trigger.closest('.ink-devtools-panel') as HTMLElement) || document.body
                      }
                    />
                  </Space>
                );
                const isCol =
                  /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(valStr.toLowerCase()) ||
                  /^(rgb|rgba|hsl)\s*\(/.test(valStr.toLowerCase());
                return (
                  <Input
                    className={styles.formInput}
                    value={valStr}
                    disabled={isProtectedKey(k)}
                    onChange={(e) => updateField(k, e.target.value)}
                    suffix={isCol ? colorSuffix : undefined}
                  />
                );
              })()
            )}
          </div>
        </div>
      ))}
      {callbackEntries.length > 0 && <Divider />}
      {callbackEntries.length > 0 && (
        <div className={styles.callbackGroup}>
          {callbackEntries.map(([k, v]) => (
            <div key={k} className={styles.formRow}>
              <div className={styles.formLeft}>
                <label className={styles.formLabel}>{k}</label>
              </div>
              <div className={styles.formRight}>
                <Input
                  className={styles.formInput}
                  suffix={<span className={styles.callbackBadge}>[回调]</span>}
                  value={typeof v === 'function' ? '[Function]' : String(v ?? '')}
                  disabled
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={styles.formActions}>
        <Button
          type="primary"
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
