import React from 'react';
import cls from './SvgIcon.module.less';

export type SvgIconName = 'github' | 'code' | 'chat' | 'copy' | 'performance' | 'jsx' | 'compat' | 'tooling';

export interface SvgIconProps {
  name: SvgIconName;
  size?: number;
  color?: string;
  title?: string;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

// 可复用 Svg 图标组件：支持尺寸、颜色与交互状态
export function SvgIcon({ name, size = 24, color = 'currentColor', title, className, onClick, ariaLabel }: SvgIconProps) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    role: 'img' as const,
    'aria-label': ariaLabel ?? title ?? name,
    className: `${cls.icon} ${className ?? ''}`,
    onClick,
  };

  const svgProps = {
    className: cls.svg,
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'github':
      return (
        <span {...commonProps}>
          <svg {...svgProps} viewBox="0 0 16 16">
            <path fill={color} stroke="none" d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.53 7.53 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </span>
      );
    case 'code':
      return (
        <span {...commonProps}>
          <svg {...svgProps}>
            <path d="M9 4l-4 8" />
            <path d="M5 8L2 6v4l3-2z" />
            <path d="M15 8l3-2v4l-3-2z" />
          </svg>
        </span>
      );
    case 'chat':
      return (
        <span {...commonProps}>
          <svg {...svgProps}>
            <path d="M4 5h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-5 3V7a2 2 0 0 1 2-2z" />
            <path d="M7 9h8M7 12h6" />
          </svg>
        </span>
      );
    case 'copy':
      return (
        <span {...commonProps}>
          <svg {...svgProps}>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <rect x="4" y="4" width="11" height="11" rx="2" />
          </svg>
        </span>
      );
    case 'performance':
      return (
        <span {...commonProps}>
          <svg {...svgProps}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 12l5-3" />
            <path d="M7 12h2" />
          </svg>
        </span>
      );
    case 'jsx':
      return (
        <span {...commonProps}>
          <svg {...svgProps}>
            <path d="M5 7c2-4 12-4 14 2-2 6-12 6-14 0" />
            <path d="M3 12h3M18 12h3" />
          </svg>
        </span>
      );
    case 'compat':
      return (
        <span {...commonProps}>
          <svg {...svgProps}>
            <rect x="4" y="4" width="16" height="12" rx="2" />
            <path d="M8 20h8" />
          </svg>
        </span>
      );
    case 'tooling':
      return (
        <span {...commonProps}>
          <svg {...svgProps}>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </span>
      );
    default:
      return null;
  }
}

export default SvgIcon;