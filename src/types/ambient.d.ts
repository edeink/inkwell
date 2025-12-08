declare module '@babel/standalone';

declare module '@theme/Mermaid' {
  const Mermaid: (props: { value: string }) => any;
  export default Mermaid;
}
