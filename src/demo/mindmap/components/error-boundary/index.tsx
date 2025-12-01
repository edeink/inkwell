import React from 'react';

import styles from './index.module.less';

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onRetry?: () => void;
};

type State = {
  error: Error | null;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Mindmap error:', error);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
    try {
      this.props.onRetry?.();
    } catch {
      void 0;
    }
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <div className={styles.errorBoundary}>
          <div className={styles.title}>渲染错误</div>
          <div className={styles.message}>{error.message}</div>
          <div className={styles.actions}>
            <button className={styles.button} onClick={this.handleRetry}>
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
