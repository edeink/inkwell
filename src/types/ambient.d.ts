declare module '@babel/standalone';

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
