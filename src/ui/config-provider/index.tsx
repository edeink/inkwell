import { Fragment, type PropsWithChildren } from 'react';

import { PopupContainerContext, type GetPopupContainer } from './context';

export type { GetPopupContainer } from './context';

export function ConfigProvider({
  children,
  getPopupContainer,
}: PropsWithChildren<{
  theme?: unknown;
  getPopupContainer?: GetPopupContainer;
}>) {
  return (
    <PopupContainerContext.Provider value={getPopupContainer ?? null}>
      <Fragment>{children}</Fragment>
    </PopupContainerContext.Provider>
  );
}
