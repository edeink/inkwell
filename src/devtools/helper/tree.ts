import type { Widget } from '../../core/base';
import type { DataNode } from 'antd/es/tree';

export type DevtoolsTreeBuild = {
  treeData: DataNode[];
  widgetByNodeKey: Map<string, Widget>;
  parentByNodeKey: Map<string, string | null>;
  nodeKeyByWidget: WeakMap<Widget, string>;
};

function getSiblingDuplicateKeys(children: Widget[]): unknown[] {
  const seen = new Map<unknown, number>();
  const dup = new Set<unknown>();
  for (let i = 0; i < children.length; i++) {
    const k = (children[i] as unknown as { key?: unknown }).key;
    if (k == null) {
      continue;
    }
    if (seen.has(k)) {
      dup.add(k);
    } else {
      seen.set(k, i);
    }
  }
  return Array.from(dup);
}

export function buildDevtoolsTree(root: Widget | null): DevtoolsTreeBuild {
  const widgetByNodeKey = new Map<string, Widget>();
  const parentByNodeKey = new Map<string, string | null>();
  const nodeKeyByWidget = new WeakMap<Widget, string>();

  function wrap(widget: Widget, nodeKey: string, parentNodeKey: string | null): DataNode {
    widgetByNodeKey.set(nodeKey, widget);
    parentByNodeKey.set(nodeKey, parentNodeKey);
    nodeKeyByWidget.set(widget, nodeKey);

    const children = widget.children ?? [];
    const dupKeys = getSiblingDuplicateKeys(children);
    const errorNodes: DataNode[] =
      dupKeys.length > 0
        ? [
            {
              key: `${nodeKey}::error`,
              title: `错误：${String(widget.type)} [${String(widget.key)}] 下同级 key 重复：${dupKeys
                .map((k) => String(k))
                .join(', ')}`,
              disabled: true,
              selectable: false,
              isLeaf: true,
            },
          ]
        : [];

    const childNodes = children.map((c, index) => wrap(c, `${nodeKey}-${index}`, nodeKey));

    return {
      key: nodeKey,
      title: `${String(widget.type)} [${String(widget.key)}]`,
      children: errorNodes.concat(childNodes),
    };
  }

  if (!root) {
    return { treeData: [], widgetByNodeKey, parentByNodeKey, nodeKeyByWidget };
  }

  return {
    treeData: [wrap(root, '0', null)],
    widgetByNodeKey,
    parentByNodeKey,
    nodeKeyByWidget,
  };
}

export function getPathNodeKeys(parentByNodeKey: Map<string, string | null>, nodeKey: string) {
  const out: string[] = [];
  let cur: string | null = nodeKey;
  while (cur) {
    out.unshift(cur);
    cur = parentByNodeKey.get(cur) ?? null;
  }
  return out;
}
