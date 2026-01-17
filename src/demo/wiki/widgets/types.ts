import type { WidgetProps } from '@/core';
import type { ThemePalette } from '@/styles/theme';

export type WikiDoc = {
  key: string;
  path: string;
  title: string;
  content: string;
};

export type WikiDocMeta = {
  key: string;
  title: string;
  path: string;
};

export type WikiSidebarProps = {
  width: number;
  height: number;
  theme: ThemePalette;
  minWidth?: number;
  maxWidth?: number;
  dividerWidth?: number;
  docs: WikiDocMeta[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onResize?: (width: number) => void;
} & WidgetProps;

export type WikiContentProps = {
  width: number;
  height: number;
  theme: ThemePalette;
  doc: WikiDoc | null;
} & WidgetProps;

export type SplitDividerProps = {
  height: number;
  theme: ThemePalette;
  width: number;
  minWidth: number;
  maxWidth: number;
  sidebarWidth: number;
  onResize: (width: number) => void;
} & WidgetProps;
