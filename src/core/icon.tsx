/** @jsxImportSource @/utils/compiler */

import { Image, ImageFit, type ImageFit as ImageFitType } from './image';
import { StatelessWidget } from './state/stateless';

import type { WidgetProps } from './base';

export interface IconProps extends WidgetProps {
  svg: string;
  size?: number;
  width?: number;
  height?: number;
  color?: string;
  fit?: ImageFitType;
}

export class Icon extends StatelessWidget<IconProps> {
  private _cachedSvg: string | null = null;
  private _cachedColor: string | null = null;
  private _cachedSrc: string | null = null;

  private getSvgSrc(svg: string, color: string | undefined): string {
    const nextSvg = svg.trim();
    const nextColor = typeof color === 'string' ? color : null;
    if (this._cachedSrc && this._cachedSvg === nextSvg && this._cachedColor === nextColor) {
      return this._cachedSrc;
    }
    const colored = nextColor ? nextSvg.replaceAll('currentColor', nextColor) : nextSvg;
    const encoded = encodeURIComponent(colored);
    const src = `data:image/svg+xml;utf8,${encoded}`;
    this._cachedSvg = nextSvg;
    this._cachedColor = nextColor;
    this._cachedSrc = src;
    return src;
  }

  protected render() {
    const { svg, size, width, height, color, fit } = this.props;
    const w = width ?? size ?? 16;
    const h = height ?? size ?? 16;
    const src = this.getSvgSrc(svg, color);
    return <Image type="image" src={src} width={w} height={h} fit={fit ?? ImageFit.Contain} />;
  }
}
