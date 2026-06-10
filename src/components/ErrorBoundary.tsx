import { Component, ReactNode } from "react";
import { logError } from "@/lib/telemetry";

interface State { hasError: boolean; message?: string }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
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
            {this.state.message || "An unexpected error occurred."}
          </p>
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
