"use client";

import { useActionState } from "react";
import { changePassword } from "../actions";

export default function ChangePasswordPage() {
  const [state, formAction] = useActionState(changePassword, { error: null as string | null });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-lg font-semibold text-zinc-900">Set a new password</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Your account requires a password change before continuing.
        </p>
        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-zinc-700">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={12}
              required
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-medium text-zinc-700">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={12}
              required
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
          {state.error && <p className="text-xs font-medium text-rose-600">{state.error}</p>}
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Save Password
          </button>
        </form>
      </div>
    </div>
  );
}
