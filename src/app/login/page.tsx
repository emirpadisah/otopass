import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Login | Otopass",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl sm:p-8">
        <header className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
            OTOPASS
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">Login</h1>
          <p className="mt-2 text-xs text-zinc-500">Admin-created users can sign in from here.</p>
        </header>

        <LoginForm />
      </div>
    </div>
  );
}
