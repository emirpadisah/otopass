"use client";

import { useActionState } from "react";
import { createUserAction } from "./actions";
import type { ActionResponse } from "@/lib/types";

const initialState: ActionResponse = { ok: false };

type DealerOption = { id: string; name: string };

export function UserCreateForm({ dealers }: { dealers: DealerOption[] }) {
  const [state, formAction] = useActionState(createUserAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold">Create User</h3>
      <input name="email" type="email" placeholder="Email" className="input" required />
      <input name="fullName" type="text" placeholder="Full Name" className="input" />
      <input
        name="password"
        type="password"
        placeholder="Temporary Password"
        className="input"
        required
      />
      <select name="role" className="input" required defaultValue="">
        <option value="" disabled>
          Select role
        </option>
        <option value="admin">admin</option>
        <option value="super_admin">super_admin</option>
        <option value="dealer_owner">dealer_owner</option>
        <option value="dealer_manager">dealer_manager</option>
        <option value="dealer_viewer">dealer_viewer</option>
      </select>
      <select name="dealerId" className="input" defaultValue="">
        <option value="">No dealer</option>
        {dealers.map((dealer) => (
          <option key={dealer.id} value={dealer.id}>
            {dealer.name}
          </option>
        ))}
      </select>
      {state.message && (
        <p className={`text-xs font-medium ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>
          {state.message}
        </p>
      )}
      <button
        type="submit"
        className="inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 shadow-sm hover:bg-zinc-800"
      >
        Create
      </button>
    </form>
  );
}
