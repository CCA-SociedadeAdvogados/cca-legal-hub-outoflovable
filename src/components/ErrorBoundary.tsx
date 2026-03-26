import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface State {
  error: Error | null;
}

const CHUNK_RELOAD_KEY = 'cca_chunk_reload_attempted';

function isChunkLoadError(error: Error): boolean {
  return (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed') ||
    error.message.includes('error loading dynamically imported module')
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // On stale-chunk errors (new deployment), reload once to get fresh assets.
    if (isChunkLoadError(error)) {
      const alreadyTried = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      if (!alreadyTried) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
      }
    }
  }

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error);

      if (isChunkLoadError(error)) {
        return (
          <div className="min-h-screen flex items-center justify-center p-8">
            <div className="max-w-md w-full space-y-4 text-center">
              <h2 className="text-xl font-bold">Nova versão disponível</h2>
              <p className="text-muted-foreground text-sm">
                A plataforma foi actualizada. Recarregue a página para continuar.
              </p>
              <button
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
                onClick={() => {
                  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
                  window.location.reload();
                }}
              >
                Recarregar
              </button>
            </div>
          </div>
        );
      }

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
