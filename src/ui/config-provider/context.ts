import { createContext } from 'react';

export type GetPopupContainer = (triggerNode?: HTMLElement) => HTMLElement;

export const PopupContainerContext = createContext<GetPopupContainer | null>(null);
