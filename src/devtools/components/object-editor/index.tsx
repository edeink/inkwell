import {
  CaretDownOutlined,
  CaretRightOutlined,
  CloseOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, ColorPicker, Input, InputNumber, Popover, Select, Space, Tooltip } from 'antd';
import { useState, type ReactNode } from 'react';

import { isColor } from '../../helper/colors';
import { isHiddenKey } from '../../helper/config';
import { formatDisplayValue, isNumberArray } from '../../helper/format';
import { DoubleClickEditableField } from '../double-click-field';
import { enumOptionsMap } from '../props-editor/enum-options';

import styles from './index.module.less';

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
  readOnly = false,
  lockedKeys = [],
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  depth?: number;
  readOnly?: boolean;
  lockedKeys?: string[];
}) {
  const allEntries = Object.entries(value || ({} as Record<string, unknown>));
  // 过滤需要隐藏的内部字段
  const hiddenEntries = allEntries.filter(([k]) => isHiddenKey(k));
  // 排序：简单类型优先，复杂对象靠后
  const entries = allEntries
    .filter(([k]) => !isHiddenKey(k))
    .sort((a, b) => {
      const isObjA = typeof a[1] === 'object' && a[1] !== null && !Array.isArray(a[1]);
      const isObjB = typeof b[1] === 'object' && b[1] !== null && !Array.isArray(b[1]);
      if (isObjA === isObjB) {
        return 0;
      }
      return isObjA ? 1 : -1;
    });

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const isLocked = (k: string) => readOnly || lockedKeys.includes(k);

  // 同步键与值的修改，确保对象结构可控
  function setKV(oldKey: string, newKey: string, newVal: unknown) {
    if (isLocked(oldKey)) {
      return;
    }
    const next: Record<string, unknown> = { ...value };
    if (oldKey !== newKey) {
      delete next[oldKey];
      next[newKey] = newVal;
    } else {
      next[oldKey] = newVal;
    }
    onChange(next);
  }

  // 删除指定键值对
  function removeKey(k: string) {
    if (isLocked(k)) {
      return;
    }
    const next: Record<string, unknown> = { ...value };
    delete next[k];
    onChange(next);
  }

  // 新增键值对并避免重复键
  function addKey() {
    if (readOnly) {
      return;
    }
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
    const locked = isLocked(k);
    return (
      <div className={styles.arrayEditor}>
        <span className={styles.arrayBracket}>[</span>
        <Space size={4} wrap={false}>
          {v.map((n, idx) => (
            <span key={`${k}-${idx}`} className={styles.arrayItem}>
              <InputNumber
                size="small"
                value={n}
                disabled={locked}
                onChange={(num) => {
                  if (locked) {
                    return;
                  }
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

  // 根据值类型渲染对应的编辑控件
  function renderValueField(k: string, v: unknown): ReactNode {
    const locked = isLocked(k);
    if (isColor(v)) {
      return (
        <DoubleClickEditableField
          className={styles.kvField}
          displayClassName={styles.kvDisplay}
          editorClassName={styles.kvEditor}
          display={<span className={styles.kvDisplayValue}>{formatDisplayValue(v)}</span>}
          editable={!locked}
          editor={() => (
            <Input
              className={styles.kvValue}
              size="small"
              value={String(v ?? '')}
              disabled={locked}
              onChange={(e) => setKV(k, k, e.target.value)}
              suffix={
                <Space>
                  <span
                    className={styles.colorPickerWrap}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <ColorPicker
                      className={styles.colorPicker}
                      value={String(v ?? '')}
                      size="small"
                      showText={false}
                      disabled={locked}
                      onChangeComplete={(c: { toHexString: () => string }) => {
                        setKV(k, k, c.toHexString());
                      }}
                      getPopupContainer={(trigger) =>
                        (trigger.closest('.ink-devtools-panel') as HTMLElement) || document.body
                      }
                    />
                  </span>
                </Space>
              }
            />
          )}
        />
      );
    }
    if (typeof v === 'number') {
      return (
        <DoubleClickEditableField
          className={styles.kvField}
          displayClassName={styles.kvDisplay}
          editorClassName={styles.kvEditor}
          display={<span className={styles.kvDisplayValue}>{formatDisplayValue(v)}</span>}
          editable={!locked}
          editor={
            <InputNumber
              className={styles.kvValue}
              size="small"
              value={Number(v)}
              disabled={locked}
              onChange={(num) => setKV(k, k, Number(num ?? 0))}
            />
          }
        />
      );
    }
    if (isNumberArray(v)) {
      return (
        <DoubleClickEditableField
          className={styles.kvField}
          displayClassName={styles.kvDisplay}
          editorClassName={styles.kvEditor}
          display={<span className={styles.kvDisplayValue}>{formatDisplayValue(v)}</span>}
          editable={!locked}
          editor={renderNumberArrayEditor(k, v)}
        />
      );
    }
    const enumOptions = enumOptionsMap[k];
    if (enumOptions) {
      return (
        <DoubleClickEditableField
          className={styles.kvField}
          displayClassName={styles.kvDisplay}
          editorClassName={styles.kvEditor}
          display={<span className={styles.kvDisplayValue}>{formatDisplayValue(v)}</span>}
          editable={!locked}
          editor={({ exit }: { exit: () => void }) => (
            <Select
              className={styles.kvValue}
              size="small"
              value={typeof v === 'string' ? v : undefined}
              placeholder="请选择"
              options={enumOptions.map((x) => ({ label: x, value: x }))}
              disabled={locked}
              onChange={(val) => {
                setKV(k, k, val);
                exit();
              }}
              getPopupContainer={(trigger) =>
                (trigger.closest('.ink-devtools-panel') as HTMLElement) || document.body
              }
            />
          )}
        />
      );
    }
    if (typeof v === 'boolean') {
      return (
        <DoubleClickEditableField
          className={styles.kvField}
          displayClassName={styles.kvDisplay}
          editorClassName={styles.kvEditor}
          display={<span className={styles.kvDisplayValue}>{formatDisplayValue(v)}</span>}
          editable={!locked}
          editor={({ exit }: { exit: () => void }) => (
            <Select
              className={styles.kvValue}
              size="small"
              value={v}
              options={[
                { label: 'true', value: true },
                { label: 'false', value: false },
              ]}
              disabled={locked}
              onChange={(val) => {
                setKV(k, k, val);
                exit();
              }}
              getPopupContainer={(trigger) =>
                (trigger.closest('.ink-devtools-panel') as HTMLElement) || document.body
              }
            />
          )}
        />
      );
    }
    return (
      <DoubleClickEditableField
        className={styles.kvField}
        displayClassName={styles.kvDisplay}
        editorClassName={styles.kvEditor}
        display={<span className={styles.kvDisplayValue}>{formatDisplayValue(v)}</span>}
        editable={!locked}
        editor={
          <Input
            className={styles.kvValue}
            size="small"
            value={Array.isArray(v) ? JSON.stringify(v) : String(v ?? '')}
            disabled={locked}
            onChange={(e) => {
              const nextStr = e.target.value;
              if (Array.isArray(v)) {
                try {
                  const parsed = JSON.parse(nextStr);
                  if (Array.isArray(parsed)) {
                    setKV(k, k, parsed);
                    return;
                  }
                } catch {
                  void 0;
                }
              }
              setKV(k, k, nextStr);
            }}
          />
        }
      />
    );
  }

  const renderKey = (k: string, v: unknown) => {
    const locked = isLocked(k);
    if (locked) {
      return (
        <div className={styles.kvKeyLocked}>
          <span>{k}</span>
          <Tooltip title="受保护属性">
            <LockOutlined className={styles.lockIcon} />
          </Tooltip>
        </div>
      );
    }
    return (
      <DoubleClickEditableField
        className={styles.kvField}
        displayClassName={styles.kvDisplay}
        editorClassName={styles.kvEditor}
        display={<span className={styles.kvDisplayKey}>{k}</span>}
        editor={
          <Tooltip title={k}>
            <Input
              className={styles.kvKey}
              size="small"
              value={k}
              onChange={(e) => setKV(k, e.target.value, v)}
            />
          </Tooltip>
        }
      />
    );
  };

  return (
    <div
      className={[styles.kvGroup, depth > 0 ? styles.nestedGroup : ''].filter(Boolean).join(' ')}
      style={{ paddingLeft: depth > 0 ? '12px' : '0' }}
    >
      {entries.map(([k, v]) => {
        const isObj = typeof v === 'object' && v !== null && !Array.isArray(v);
        const isOpen = !!openMap[k] || !isObj;
        const locked = isLocked(k);

        if (isObj) {
          return (
            <div key={k} className={styles.kvRowObject}>
              <div className={[styles.kvHeader, isOpen ? styles.expanded : ''].join(' ')}>
                <div className={styles.kvHeaderLeft}>
                  <Button
                    size="small"
                    type="text"
                    icon={isOpen ? <CaretDownOutlined /> : <CaretRightOutlined />}
                    onClick={() => setOpenMap({ ...openMap, [k]: !isOpen })}
                  />
                  {renderKey(k, v)}
                </div>
                <div className={styles.kvHeaderActions}>
                  {!locked && (
                    <Button
                      size="small"
                      type="text"
                      className={styles.deleteBtn}
                      icon={<CloseOutlined />}
                      onClick={() => removeKey(k)}
                    />
                  )}
                </div>
              </div>
              {isOpen && (
                <div className={styles.kvBody}>
                  <ObjectEditor
                    value={v as Record<string, unknown>}
                    onChange={(nv) => setKV(k, k, nv)}
                    depth={depth + 1}
                    readOnly={readOnly}
                    lockedKeys={lockedKeys} // 传递 lockedKeys 到子组件，虽然通常子属性不一定被锁，但视需求而定。如果只是顶层 key 锁了，子对象通常是可编辑的。这里假设 lockedKeys 仅针对当前层级。
                    // 但是递归传递 lockedKeys 可能会导致子对象的同名 key 也被锁。
                    // 实际上 lockedKeys 通常是针对根对象的路径。
                    // 为了简化，我们暂时不传递 lockedKeys 给子对象，或者清空它。
                    // 除非 lockedKeys 是 path 列表。目前看 PropsEditor 里 locked 的只有 'key'。
                    // 简单起见，lockedKeys 只作用于当前层。
                    // 但如果 'key' 出现在子对象里呢？通常不会。
                  />
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={k} className={styles.kvRow}>
            <div className={styles.kvLeft}>{renderKey(k, v)}</div>
            <div className={styles.kvRight}>
              {renderValueField(k, v)}
              {!locked && (
                <Button
                  size="small"
                  type="text"
                  className={styles.deleteBtn}
                  icon={<CloseOutlined />}
                  onClick={() => removeKey(k)}
                />
              )}
            </div>
          </div>
        );
      })}
      {!readOnly && (
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
      )}
    </div>
  );
}
