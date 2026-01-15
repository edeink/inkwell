declare module '@babel/standalone';

declare module '*.module.less' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.less' {
  const content: string;
  export default content;
}

declare module '@docusaurus/BrowserOnly' {
  import type { ReactNode } from 'react';

  const BrowserOnly: (props: { children: () => ReactNode; fallback?: ReactNode }) => JSX.Element;
  export default BrowserOnly;
}

declare module '@theme/Layout' {
  import type { ReactNode } from 'react';

  const Layout: (props: {
    children: ReactNode;
    title?: string;
    description?: string;
    noFooter?: boolean;
  }) => JSX.Element;
  export default Layout;
}

declare module '@theme/Mermaid' {
  const Mermaid: (props: { value: string }) => JSX.Element;
  export default Mermaid;
}

interface Window {
  __INKWELL_DEVTOOLS_HOOK__?: {
    emit: (event: string, data: unknown) => void;
    on: (event: string, callback: (data: unknown) => void) => void;
    off: (event: string, callback: (data: unknown) => void) => void;
  };
}
