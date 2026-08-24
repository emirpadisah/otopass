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
if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("BOOTSTRAP_SUPER_ADMIN_EMAIL is invalid.");
if (password.length < 12 || password.length > 128 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
  throw new Error("BOOTSTRAP_SUPER_ADMIN_PASSWORD must be 12-128 characters and contain upper/lowercase letters and a number.");
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
let user = null;
for (let page = 1; page <= 20 && !user; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === email) ?? null;
  if (data.users.length < 200) break;
}

if (user) {
  const { data: existingRole, error: existingRoleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .maybeSingle();
  if (existingRoleError) throw existingRoleError;
  if (existingRole) {
    console.log(`Super admin already exists: ${email}`);
    process.exit(0);
  }
}

const { count: existingSuperAdmins, error: superAdminLookupError } = await supabase
  .from("user_roles")
  .select("user_id", { count: "exact", head: true })
  .eq("role", "super_admin");
if (superAdminLookupError) throw superAdminLookupError;
if ((existingSuperAdmins ?? 0) > 0) {
  throw new Error("A super admin already exists. Use the admin workflow instead of bootstrap.");
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
  full_name: "otoköprü Süper Yönetici",
  must_change_password: true,
  is_active: true,
  deactivated_at: null,
});
if (profileError) throw profileError;
const { error: roleDeleteError } = await supabase.from("user_roles").delete().eq("user_id", user.id);
if (roleDeleteError) throw roleDeleteError;
const { error: roleError } = await supabase.from("user_roles").insert({ user_id: user.id, role: "super_admin" });
if (roleError) throw roleError;
const { error: membershipDeleteError } = await supabase.from("dealer_users").delete().eq("user_id", user.id);
if (membershipDeleteError) throw membershipDeleteError;
const { error: auditError } = await supabase.from("activity_log").insert({ actor_user_id: user.id, action: "SUPER_ADMIN_BOOTSTRAPPED", metadata: { email } });
if (auditError) throw auditError;

console.log(`Super admin ready: ${email}`);
