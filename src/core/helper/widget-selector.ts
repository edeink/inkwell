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

const CACHE = new WeakMap<Widget, Map<string, Widget[]>>();

export function clearSelectorCache(root?: Widget | null): void {
  if (!root) {
    return;
  }
  CACHE.delete(root);
}

function isViewportLike(w: Widget | null): boolean {
  if (!w) {
    return false;
  }
  const obj = w as unknown as { scale?: unknown; tx?: unknown; ty?: unknown };
  return typeof obj.scale === 'number' && typeof obj.tx === 'number' && typeof obj.ty === 'number';
}
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
        if (data?.active !== true) {
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

export function findWidget(
  root: Widget | null,
  selector: string,
  options: FindOptions = {},
): Widget | Widget[] | null {
  if (!root || !selector) {
    return null;
  }
  const cacheKey = selector;
  const cacheMap = CACHE.get(root) ?? new Map<string, Widget[]>();
  if (!CACHE.has(root)) {
    CACHE.set(root, cacheMap);
  }
  if (options.multiple) {
    const hit = cacheMap.get(cacheKey);
    if (hit) {
      return hit.slice();
    }
  }
  const steps = parseSelector(selector);
  const startSet: Widget[] = [options.context ?? root];
  let cur: Widget[] = startSet;
  for (const st of steps) {
    cur = stepMatch(cur, st);
    if (cur.length === 0) {
      break;
    }
  }
  if (options.multiple) {
    cacheMap.set(cacheKey, cur);
    return cur;
  }
  return cur[0] ?? null;
}

export default {
  findWidget,
  clearSelectorCache,
};
