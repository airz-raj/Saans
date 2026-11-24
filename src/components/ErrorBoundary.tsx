import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** Shown in the message, e.g. "Breath budget". */
  section: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/**
 * Keeps one broken panel from blanking the whole app: the failing section shows a short
 * message with a retry button, and every other tab keeps working.
 */
export class ErrorBoundary extends Component<Readonly<ErrorBoundaryProps>, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Saans: "${this.props.section}" failed to render`, error, info.componentStack);
  }

  private readonly retry = (): void => {
    this.setState({ failed: false });
  };

  override render(): ReactNode {
    return this.state.failed ? this.renderFallback() : this.props.children;
  }

  private renderFallback(): ReactNode {
    return (
      <div className="card" role="alert">
        <h2>{this.props.section} could not be shown</h2>
        <p>Something went wrong while drawing this section. Your saved settings are safe.</p>
        <button type="button" className="button" onClick={this.retry}>
          Try again
        </button>
      </div>
    );
  }
}
