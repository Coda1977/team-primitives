import { Component } from "react";
import { C } from "../../config/constants";
import StatusBlock from "./StatusBlock";

// Top-level guard against React render-time crashes. Without this, a thrown
// error inside any descendant (a malformed Convex payload, a broken third-party
// import, an unguarded `.map` on a future-shape change) renders a blank white
// page with no recovery affordance.
//
// Class component because the error-boundary lifecycle hooks
// (`getDerivedStateFromError`, `componentDidCatch`) have no functional
// equivalent yet.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Log to the browser console for now. If/when an error-reporting service
    // (Sentry, etc.) is wired up, plug it in here.
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.error) {
      const message = this.state.error?.message || "Unexpected error.";
      return (
        <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
          <div className="max-w-md text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span
                className="inline-block w-1 h-5"
                style={{ background: C.red }}
              />
              <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-500">
                Something broke
              </span>
            </div>
            <h1
              className="font-bold leading-[1.05] tracking-tight mb-5"
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                letterSpacing: "-0.02em",
              }}
            >
              The page hit an error
            </h1>
            <div className="mb-8 text-left">
              <StatusBlock variant="alert" kicker="Error details">
                {message}
              </StatusBlock>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.22em]"
              style={{ background: C.red, color: C.white }}
            >
              Reload the page
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
