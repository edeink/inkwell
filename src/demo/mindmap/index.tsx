import { createRoot } from 'react-dom/client';

import MindmapComponent from './components';

const stage = document.getElementById('stage');
if (stage) {
  const root = createRoot(stage);
  root.render(<MindmapComponent />);
}
