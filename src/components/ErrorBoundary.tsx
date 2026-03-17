import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error);
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-2xl w-full space-y-4">
            <h2 className="text-xl font-bold text-destructive">Erro na página</h2>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-auto whitespace-pre-wrap break-all">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
              onClick={() => this.setState({ error: null })}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
