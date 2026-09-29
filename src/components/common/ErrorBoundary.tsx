import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Short name of the area, shown in the fallback. */
  area?: string;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/** Keeps a failure in one panel from taking down the whole editor. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.area ?? 'app'}]`, error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return (
      <div className="error-boundary" role="alert">
        <strong>{this.props.area ? `${this.props.area} crashed` : 'Something went wrong'}</strong>
        <p>{error.message}</p>
        <button type="button" className="btn btn--sm" onClick={this.reset}>
          Try again
        </button>
      </div>
    );
  }
}
