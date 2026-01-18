import { PropsEditor } from '../../props-editor';

import type { Widget } from '@/core/base';

export function DevtoolsPropsPane({
  widget,
  onApply,
}: {
  widget: Widget | null;
  onApply: () => void;
}) {
  return <PropsEditor widget={widget} onChange={onApply} />;
}
