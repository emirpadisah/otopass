import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const email = required("BOOTSTRAP_SUPER_ADMIN_EMAIL").toLowerCase();
const password = required("BOOTSTRAP_SUPER_ADMIN_PASSWORD");
if (password.length < 12) throw new Error("BOOTSTRAP_SUPER_ADMIN_PASSWORD must be at least 12 characters.");

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
let user = null;
for (let page = 1; page <= 20 && !user; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === email) ?? null;
  if (data.users.length < 200) break;
}

if (!user) {
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error || new Error("Super admin could not be created.");
  user = data.user;
} else {
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) throw error;
}

const { error: profileError } = await supabase.from("user_profiles").upsert({
  user_id: user.id,
  full_name: "Otopass Super Admin",
  must_change_password: true,
  is_active: true,
  deactivated_at: null,
});
if (profileError) throw profileError;
const { error: roleDeleteError } = await supabase.from("user_roles").delete().eq("user_id", user.id);
if (roleDeleteError) throw roleDeleteError;
const { error: roleError } = await supabase.from("user_roles").insert({ user_id: user.id, role: "super_admin" });
if (roleError) throw roleError;
await supabase.from("dealer_users").delete().eq("user_id", user.id);
await supabase.from("activity_log").insert({ actor_user_id: user.id, action: "SUPER_ADMIN_BOOTSTRAPPED", metadata: { email } });

console.log(`Super admin ready: ${email}`);
