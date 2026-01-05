/**
 * 查找组件工具函数
 * 提供类似于 DOM 的 querySelector 功能，支持按 ID、Type、属性查找组件
 */

import type { Widget } from '@/core/base';

type Combinator = 'descendant' | 'child';

interface AttrSelector {
  name: string;
  value?: string;
  operator?: '=';
}

interface SimpleSelector {
  tag?: string;
  id?: string;
  classes?: string[];
  attrs?: AttrSelector[];
  pseudos?: string[];
}

interface SelectorStep {
  combinator: Combinator;
  sel: SimpleSelector;
}

export interface FindOptions {
  multiple?: boolean;
  context?: Widget | null;
}

// 缓存选择器结果，避免频繁重复查找
const CACHE = new WeakMap<Widget, Map<string, Widget[]>>();

/**
 * 清除选择器缓存
 * 当组件树发生变更时应当调用
 */
export function clearSelectorCache(root?: Widget | null): void {
  if (!root) {
    return;
  }
  CACHE.delete(root);
}

/**
 * 判断是否为根节点（逻辑根）
 * 即父级不存在或父级中没有指向自身的引用（如连接线）
 */
function isRootNode(widget: Widget | null): boolean {
  if (!widget) {
    return false;
  }
  const p = widget.parent as Widget | null;
  if (!p) {
    return true;
  }
  for (const s of p.children) {
    const rec = s as unknown as { toKey?: unknown };
    if (typeof rec.toKey === 'string' && String(rec.toKey) === String(widget.key)) {
      return false;
    }
  }
  return true;
}

function parseSelector(selector: string): SelectorStep[] {
  const tokens: SelectorStep[] = [];
  const parts = selector.trim().split(/\s+(?![^[]*])/);
  let prevCombinator: Combinator = 'descendant';
  for (const partRaw of parts) {
    const sub = partRaw.split('>');
    for (let i = 0; i < sub.length; i++) {
      const s = sub[i].trim();
      if (!s) {
        continue;
      }
      const sel: SimpleSelector = { classes: [], attrs: [], pseudos: [] };
      let rest = s;
      // tag
      const tagMatch = rest.match(/^[a-zA-Z_-][\w-]*/);
      if (tagMatch) {
        sel.tag = tagMatch[0];
        rest = rest.slice(tagMatch[0].length);
      }
      // id/class/attr/pseudo sequence
      const re = /(#[\w-]+)|(\.[\w-]+)|(\[[^\]]+\])|(:[\w-]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(rest)) !== null) {
        const [tok] = m;
        if (tok.startsWith('#')) {
          sel.id = tok.slice(1);
        } else if (tok.startsWith('.')) {
          sel.classes!.push(tok.slice(1));
        } else if (tok.startsWith('[')) {
          const mm = tok.slice(1, -1).match(/^(?<name>[\w-]+)(?:\s*=?\s*"?(?<value>[^"]+)"?)?$/);
          const name = mm?.groups?.name ?? '';
          const value = mm?.groups?.value;
          sel.attrs!.push({ name, value, operator: mm?.groups?.value ? '=' : undefined });
        } else if (tok.startsWith(':')) {
          sel.pseudos!.push(tok.slice(1));
        }
      }
      tokens.push({ combinator: prevCombinator, sel });
      prevCombinator = 'child';
    }
    prevCombinator = 'descendant';
  }
  return tokens;
}

function matchSimple(w: Widget, sel: SimpleSelector): boolean {
  // tag => type
  if (sel.tag) {
    const norm = (s: string) => s.toLowerCase().replace(/stub$/i, '');
    const a = norm(String(sel.tag));
    const b = norm(String(w.type));
    if (a !== b) {
      return false;
    }
  }
  if (sel.id) {
    if (String(w.key) !== String(sel.id)) {
      return false;
    }
  }
  if (sel.classes && sel.classes.length) {
    const data = w.data as unknown as { className?: unknown };
    const cls = Array.isArray(data?.className)
      ? (data?.className as string[])
      : String(data?.className || '')
          .split(/\s+/)
          .filter(Boolean);
    for (const c of sel.classes) {
      const byType = String(w.type).toLowerCase() === String(c).toLowerCase();
      const inClassName = cls.some((x) => String(x).toLowerCase() === String(c).toLowerCase());
      if (!byType && !inClassName) {
        return false;
      }
    }
  }
  if (sel.attrs && sel.attrs.length) {
    for (const a of sel.attrs) {
      const data = w.data as unknown as Record<string, unknown>;
      let val: unknown = data[a.name];
      if (val === undefined) {
        val = (w as unknown as Record<string, unknown>)[a.name];
      }
      if (a.operator === '=') {
        if (String(val) !== String(a.value ?? '')) {
          return false;
        }
      } else if (val === undefined) {
        return false;
      }
    }
  }
  if (sel.pseudos && sel.pseudos.length) {
    for (const p of sel.pseudos) {
      if (p === 'active') {
        const data = w.data as unknown as { active?: unknown };
        const dataActive = data?.active === true;
        const instanceActive = (w as unknown as Record<string, unknown>).active === true;
        if (!dataActive && !instanceActive) {
          return false;
        }
      } else if (p === 'root') {
        if (!isRootNode(w)) {
          return false;
        }
      } else {
        return false; // unsupported pseudo
      }
    }
  }
  return true;
}

function collectDescendants(w: Widget): Widget[] {
  const out: Widget[] = [];
  const queue: Widget[] = [w];
  while (queue.length) {
    const cur = queue.shift()!;
    out.push(cur);
    for (const c of cur.children) {
      queue.push(c as Widget);
    }
  }
  return out;
}

function stepMatch(prevSet: Widget[], step: SelectorStep): Widget[] {
  const res: Widget[] = [];
  if (step.combinator === 'descendant') {
    for (const base of prevSet) {
      for (const cand of collectDescendants(base)) {
        if (matchSimple(cand, step.sel)) {
          res.push(cand);
        }
      }
    }
  } else {
    for (const base of prevSet) {
      for (const cand of base.children as Widget[]) {
        if (matchSimple(cand, step.sel)) {
          res.push(cand);
        }
      }
    }
  }
  return res;
}

/**
 * 查找组件
 * @param node 当前上下文节点，支持从任意节点开始查找
 * @param selector 选择器字符串，支持 ID(#), Class(.), Type(Tag), Attr([])
 * @param options 查找选项
 * @returns 找到的组件或组件数组
 */
export function findWidget<T = Widget>(
  node: Widget | null,
  selector: string,
  options: FindOptions = {},
): T | T[] | null {
  if (!node || !selector) {
    return null;
  }
  const cacheKey = selector;
  const cacheMap = CACHE.get(node) ?? new Map<string, Widget[]>();
  if (!CACHE.has(node)) {
    CACHE.set(node, cacheMap);
  }
  if (options.multiple) {
    const hit = cacheMap.get(cacheKey);
    if (hit) {
      return hit.slice() as unknown as T[];
    }
  }
  const steps = parseSelector(selector);
  const startSet: Widget[] = [options.context ?? node];
  let cur: Widget[] = startSet;
  for (const st of steps) {
    cur = stepMatch(cur, st);
    if (cur.length === 0) {
      break;
    }
  }
  if (options.multiple) {
    cacheMap.set(cacheKey, cur);
    return cur as unknown as T[];
  }
  return (cur[0] ?? null) as unknown as T | null;
}

export default {
  findWidget,
  clearSelectorCache,
};
