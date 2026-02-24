import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#d1fae5,transparent_45%),radial-gradient(circle_at_80%_0%,#e2e8f0,transparent_45%),#f8fafc]">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Otopass</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Secure vehicle intake and dealer offer workflow.
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-zinc-600 sm:text-base">
          Customers submit vehicle details. Dealers review assigned applications. Admin manages users
          and permissions from a single panel.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Login
          </Link>
        </div>
      </main>
    </div>
  );
}
