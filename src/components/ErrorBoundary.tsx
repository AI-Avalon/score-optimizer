import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          padding: '24px',
          background: 'var(--color-base)',
          color: 'var(--color-text)',
          textAlign: 'center'
        }}>
          <AlertTriangle size={48} className="text-red-500" style={{ marginBottom: '16px', color: 'var(--color-danger)' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
            描画エラーが発生しました
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-dim)', marginBottom: '24px' }}>
            {this.state.error?.message}
          </p>
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            再試行する
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
