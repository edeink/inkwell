import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import InkPlayground from '@/site/components/ink-playground';

const showcaseCode = `
<Container padding={24} borderRadius={16} color="#000000" width={500}>
  <Column spacing={16} crossAxisAlignment="center" mainAxisSize="min">
    <Text text="InkWell Studio" fontSize={24} color="#ffffff" fontWeight={700} />
    <Wrap spacing={16} runSpacing={24}>
      {[
        { text: '像素直控', color: '#003a8c' },
        { text: 'JSX 支持', color: '#531dab' },
        { text: 'DevTools 调试', color: '#1a7f37' },
        { text: 'Widget 布局', color: '#d48806' },
        { text: '完善文档', color: '#1677ff' },
        { text: '跨平台兼容', color: '#b32aa9' },
      ].map(({ text, color }) => (
        <Container width={140} height={90} color={color} borderRadius={12}>
          <Center>
            <Text text={text} fontSize={16} color="#ffffff" fontWeight={600} />
          </Center>
        </Container>
      ))}
    </Wrap>
  </Column>
</Container>`;

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <InkPlayground mode="readonly" code={showcaseCode} width={800} height={600} />
    </div>
  );
}

const container = document.getElementById('container');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
