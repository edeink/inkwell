import BrowserOnly from '@docusaurus/BrowserOnly';
import Layout from '@theme/Layout';

import type { ComponentType } from 'react';

declare const require: (id: string) => unknown;

export default function DemoPage() {
  return (
    <Layout title="Playground" description="Inkwell Playground" noFooter>
      <div
        style={{
          height: 'calc(100vh - 60px)', // Subtract navbar height
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <BrowserOnly fallback={<div style={{ padding: 20 }}>Loading Playground...</div>}>
          {() => {
            const mod = require('@/demo') as { default: ComponentType };
            const UnifiedDemo = mod.default as ComponentType;
            return <UnifiedDemo />;
          }}
        </BrowserOnly>
      </div>
    </Layout>
  );
}
