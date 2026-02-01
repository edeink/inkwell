import { createContext, useContext, type CSSProperties, type PropsWithChildren } from 'react';

const RowGutterContext = createContext<number>(0);

export type RowProps = PropsWithChildren<{
  gutter?: number;
  style?: CSSProperties;
  className?: string;
}>;

export function Row({ gutter = 0, style, className, children }: RowProps) {
  const g = gutter;
  return (
    <RowGutterContext.Provider value={g}>
      <div
        className={className}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          marginLeft: g ? -g / 2 : undefined,
          marginRight: g ? -g / 2 : undefined,
          ...style,
        }}
      >
        {children}
      </div>
    </RowGutterContext.Provider>
  );
}

export function useRowGutter(): number {
  return useContext(RowGutterContext);
}
