import { Component, ReactNode } from "react";
import { logError } from "@/lib/telemetry";

interface State { hasError: boolean; diagnosticId?: string }

/**
 * Root error boundary.
 *
 * Security note: we never render `error.message` or `error.stack` to the user.
 * Raw errors can contain SQL fragments, JWT contents, or internal IDs. Instead
 * we log the real error to telemetry with a short diagnostic id the user can
 * quote to support.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    const diagnosticId =
      (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    return { hasError: true, diagnosticId };
  }

  componentDidCatch(error: Error) {
    logError(error, { route: typeof location !== "undefined" ? location.pathname : undefined });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="text-xl font-heading font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            We've logged the issue and our team will look into it. Please try reloading.
          </p>
          {this.state.diagnosticId && (
            <p className="text-xs text-muted-foreground">
              Diagnostic ID: <code className="font-mono">{this.state.diagnosticId}</code>
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
