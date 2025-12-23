import type { ShortcutCommand, ShortcutContext } from '../types';

/**
 * 阻止浏览器默认缩放行为
 * 快捷键: Ctrl/Meta + (+, -, =, 0)
 */
export const PreventBrowserZoomCommand: ShortcutCommand = {
  id: 'prevent-browser-zoom',
  keys: ['Ctrl++', 'Meta++', 'Ctrl+-', 'Meta+-', 'Ctrl+=', 'Meta+=', 'Ctrl+0', 'Meta+0'],
  priority: 1000, // 高优先级
  execute: ({ nativeEvent }: ShortcutContext) => {
    nativeEvent.preventDefault();
    return true;
  },
};
