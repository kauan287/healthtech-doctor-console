import { Component, type ReactNode } from "react";
import { Link, useLocation } from "react-router";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
        <p className="font-medium">No se pudo mostrar esta página por un error inesperado.</p>
        <Link
          to="/"
          className="mt-3 inline-block text-sm font-medium text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-teal-600"
        >
          ← Volver a la cola
        </Link>
      </div>
    );
  }
}

/** Keeps a render error inside the page that threw, and clears it when the doctor navigates away. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  return <Boundary key={useLocation().pathname}>{children}</Boundary>;
}
