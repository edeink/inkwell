export function stripJsxImportSource(src: string): string {
  return src
    .replace(/\/\*+\s*@jsxImportSource[\s\S]*?\*\//g, '')
    .replace(/\/\/\s*@jsxImportSource[^\n]*/g, '')
    .trim();
}
