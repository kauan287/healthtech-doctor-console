import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { WakeNotice } from "./WakeNotice";

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
    isActive ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            <span>
              HealthTech <span className="font-normal text-slate-500">Consola médica</span>
            </span>
          </Link>
          <nav aria-label="Principal" className="flex gap-1">
            <NavLink to="/" end className={navClass}>
              Cola de recetas
            </NavLink>
            <NavLink to="/new" className={navClass}>
              Nueva receta
            </NavLink>
          </nav>
        </div>
      </header>
      <WakeNotice />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
