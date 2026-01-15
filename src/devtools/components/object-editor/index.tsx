import {
  CaretDownOutlined,
  CaretRightOutlined,
  CloseOutlined,
  EyeInvisibleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, ColorPicker, Input, InputNumber, Popover, Select, Space, Tooltip } from 'antd';
import { useState } from 'react';

import { isColor } from '../../helper/colors';
import { isHiddenKey } from '../../helper/config';

import styles from './index.module.less';

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

/**
 * ObjectEditor
 * 功能：以 KV 形式编辑对象属性，支持数字与颜色类型的专用输入
 * 参数：value - 对象值；onChange - 对象变更回调
 * 返回：无（受控组件，通过 onChange 输出）
 */
export function ObjectEditor({
  value,
  onChange,
  depth = 0,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  depth?: number;
}) {
  const allEntries = Object.entries(value || ({} as Record<string, unknown>));
  const hiddenEntries = allEntries.filter(([k]) => isHiddenKey(k));
  const entries = allEntries.filter(([k]) => !isHiddenKey(k));
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  function setKV(oldKey: string, newKey: string, newVal: unknown) {
    const next: Record<string, unknown> = { ...value };
    if (oldKey !== newKey) {
      delete next[oldKey];
      next[newKey] = newVal;
    } else {
      next[oldKey] = newVal;
    }
    onChange(next);
  }

  function removeKey(k: string) {
    const next: Record<string, unknown> = { ...value };
    delete next[k];
    onChange(next);
  }

  function addKey() {
    const base = 'key';
    let i = 1;
    let k = `${base}${i}`;
    while (value && Object.prototype.hasOwnProperty.call(value, k)) {
      i += 1;
      k = `${base}${i}`;
    }
    const next: Record<string, unknown> = { ...value, [k]: '' };
    onChange(next);
  }

  function renderNumberArrayEditor(k: string, v: number[]) {
    return (
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
                  setKV(k, k, next);
                }}
              />
              {idx < v.length - 1 && <span className={styles.arrayComma}>,</span>}
            </span>
          ))}
        </Space>
        <span className={styles.arrayBracket}>]</span>
      </div>
    );
  }

  function renderEnumSelect(k: string, v: unknown) {
    const options = enumOptionsMap[k];
    if (!options) {
      return null;
    }
    const valueStr = typeof v === 'string' ? v : undefined;
    return (
      <Select
        className={styles.kvValue}
        size="small"
        value={valueStr}
        placeholder="请选择"
        options={options.map((x) => ({ label: x, value: x }))}
        onChange={(val) => setKV(k, k, val)}
        getPopupContainer={(trigger) =>
          (trigger.closest('.ink-devtools-panel') as HTMLElement) || document.body
        }
      />
    );
  }

  return (
    <div
      className={[styles.kvGroup, depth > 0 ? styles.nestedGroup : ''].filter(Boolean).join(' ')}
    >
      {entries.map(([k, v]) => {
        const isObj = typeof v === 'object' && v !== null && !Array.isArray(v);
        const isOpen = !!openMap[k] || !isObj;
        return (
          <div key={k} className={styles.kvRow}>
            <div className={styles.kvLeft}>
              {isObj && (
                <Button
                  size="small"
                  type="text"
                  icon={isOpen ? <CaretDownOutlined /> : <CaretRightOutlined />}
                  onClick={() => setOpenMap({ ...openMap, [k]: !isOpen })}
                />
              )}
              <Tooltip title={k}>
                <Input
                  className={styles.kvKey}
                  size="small"
                  value={k}
                  onChange={(e) => setKV(k, e.target.value, v)}
                />
              </Tooltip>
            </div>
            <div className={styles.kvRight}>
              {isObj ? (
                isOpen ? (
                  <div className={styles.nested}>
                    <ObjectEditor
                      value={v as Record<string, unknown>}
                      onChange={(nv) => setKV(k, k, nv)}
                      depth={depth + 1}
                    />
                  </div>
                ) : (
                  <div />
                )
              ) : isColor(v) ? (
                <Input
                  className={styles.kvValue}
                  size="small"
                  value={String(v ?? '')}
                  onChange={(e) => setKV(k, k, e.target.value)}
                  suffix={
                    <Space>
                      <span className={styles.colorPickerWrap}>
                        <ColorPicker
                          value={String(v ?? '')}
                          size="small"
                          showText={false}
                          onChangeComplete={(c: { toHexString: () => string }) =>
                            setKV(k, k, c.toHexString())
                          }
                          getPopupContainer={(trigger) =>
                            (trigger.closest('.ink-devtools-panel') as HTMLElement) || document.body
                          }
                        />
                      </span>
                    </Space>
                  }
                />
              ) : typeof v === 'number' ? (
                <InputNumber
                  className={styles.kvValue}
                  size="small"
                  value={Number(v)}
                  onChange={(num) => setKV(k, k, Number(num ?? 0))}
                />
              ) : isNumberArray(v) ? (
                renderNumberArrayEditor(k, v)
              ) : (
                (renderEnumSelect(k, v) ?? (
                  <Input
                    className={styles.kvValue}
                    size="small"
                    value={Array.isArray(v) ? JSON.stringify(v) : String(v ?? '')}
                    onChange={(e) => {
                      const nextStr = e.target.value;
                      if (Array.isArray(v)) {
                        try {
                          const parsed = JSON.parse(nextStr);
                          if (Array.isArray(parsed)) {
                            setKV(k, k, parsed);
                            return;
                          }
                        } catch {}
                      }
                      setKV(k, k, nextStr);
                    }}
                  />
                ))
              )}
              <Button
                size="small"
                type="text"
                className={styles.deleteBtn}
                icon={<CloseOutlined />}
                onClick={() => removeKey(k)}
              />
            </div>
          </div>
        );
      })}
      <div className={styles.kvActions}>
        {hiddenEntries.length > 0 && (
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
        )}
        <Button
          type="text"
          size="small"
          className={styles.addBtn}
          icon={<PlusOutlined />}
          onClick={addKey}
        >
          添加属性
        </Button>
      </div>
    </div>
  );
}
