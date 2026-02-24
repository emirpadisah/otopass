export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-zinc-500">Operational settings and security posture.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Security Defaults</h3>
          <ul className="mt-2 space-y-1 text-xs text-zinc-600">
            <li>Private storage bucket for application photos</li>
            <li>Admin-only user provisioning</li>
            <li>Must-change-password on first login</li>
            <li>Server-side input validation and cooldown</li>
          </ul>
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Environment Contract</h3>
          <ul className="mt-2 space-y-1 text-xs text-zinc-600">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            <li>SUPABASE_SERVICE_ROLE_KEY</li>
            <li>OPTIONAL_ENABLE_CAPTCHA=false</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
