declare module '@babel/standalone';

declare module '*.module.less' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.less' {
  const content: string;
  export default content;
}

interface Window {
  __INKWELL_DEVTOOLS_HOOK__?: {
    emit: (event: string, data: unknown) => void;
    on: (event: string, callback: (data: unknown) => void) => void;
    off: (event: string, callback: (data: unknown) => void) => void;
  };
}
