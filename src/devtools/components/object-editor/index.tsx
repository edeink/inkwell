import { CaretDownOutlined, CaretRightOutlined, CloseOutlined } from "@ant-design/icons";
import { Button, ColorPicker, Input, InputNumber, Space, Tooltip } from "antd";
import { useState } from "react";

import { isColor } from "../../helper/colors";

import styles from "./index.module.less";

/**
 * ObjectEditor
 * 功能：以 KV 形式编辑对象属性，支持数字与颜色类型的专用输入
 * 参数：value - 对象值；onChange - 对象变更回调
 * 返回：无（受控组件，通过 onChange 输出）
 */
export function ObjectEditor({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const entries = Object.entries(value || {} as Record<string, unknown>);
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
    const base = "key";
    let i = 1;
    let k = `${base}${i}`;
    while (value && Object.prototype.hasOwnProperty.call(value, k)) { i += 1; k = `${base}${i}`; }
    const next: Record<string, unknown> = { ...value, [k]: "" };
    onChange(next);
  }

  return (
    <div className={styles.kvGroup}>
      {entries.map(([k, v]) => {
        const isObj = typeof v === "object" && v !== null && !Array.isArray(v);
        const isOpen = !!openMap[k] || !isObj;
        return (
          <div key={k} className={styles.kvRow}>
            <Space>
              {isObj && (
                <Button size="small" type="text" icon={
                  isOpen ? <CaretDownOutlined /> : <CaretRightOutlined />
                } onClick={() => setOpenMap({ ...openMap, [k]: !isOpen })} />
              )}
              <Tooltip title={k}><Input className={styles.kvKey} value={k} onChange={(e) => setKV(k, e.target.value, v)} /></Tooltip>
            </Space>
            {isObj ? (
              isOpen ? (
                <div>
                  <ObjectEditor value={v as Record<string, unknown>} onChange={(nv) => setKV(k, k, nv)} />
                </div>
              ) : (
                <div />
              )
            ) : (
              isColor(v) ? (
                <Input
                  className={styles.kvValue}
                  value={String(v ?? "")}
                  onChange={(e) => setKV(k, k, e.target.value)}
                  suffix={<Space><ColorPicker value={String(v ?? "")} onChangeComplete={(c: { toHexString: () => string }) => setKV(k, k, c.toHexString())} /><div className={styles.colorSwatch} style={{ background: String(v ?? "transparent") }} /></Space>}
                />
              ) : (typeof v === "number" ? (
                <InputNumber className={styles.kvValue} value={Number(v)} onChange={(num) => setKV(k, k, Number(num ?? 0))} />
              ) : (
                <Input className={styles.kvValue} value={String(v ?? "")} onChange={(e) => setKV(k, k, e.target.value)} />
              ))
            )}
            <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => removeKey(k)} />
          </div>
        );
      })}
      <div className={styles.kvActions}>
        <Button type="text" icon={<CaretRightOutlined />} onClick={addKey}>添加属性</Button>
      </div>
    </div>
  );
}