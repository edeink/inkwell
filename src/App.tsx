import './App.css';
import Demo from './demo';
import CodeStatsReportPage from './reports/code-stats';

function App() {
  const isCodeStats =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/reports/code-stats');
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {isCodeStats ? <CodeStatsReportPage /> : <Demo />}
    </div>
  );
}

export default App;
