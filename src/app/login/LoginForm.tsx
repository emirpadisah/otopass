"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, formAction] = useActionState(login, { error: null as string | null });

  return (
    <form className="space-y-4" action={formAction}>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/40"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/40"
        />
      </div>

      {state.error && <p className="text-xs font-medium text-rose-600">{state.error}</p>}

      <button
        type="submit"
        className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      >
        Login
      </button>
    </form>
  );
}
