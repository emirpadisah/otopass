import "server-only";

import { cache } from "react";
import { isEmailVerificationRequired, passesEmailGate } from "./email-policy";
import { isLocalDataMode } from "@/lib/data-mode";
import { getLocalSessionUser } from "@/lib/local/auth";
import { readLocalData } from "@/lib/local/store";
import type { UserRole } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/database.types";
import { getVerifiedAssurance, hasRequiredAssurance, type SessionAssurance } from "./mfa-policy";

type DealerRow = Database["public"]["Tables"]["dealers"]["Row"];

export type RequestAccessContext = {
  // Email gate satisfied by proof OR the fixed existing-account exemption.
  emailVerified: boolean;
  assurance: SessionAssurance;
  mfaExempt: boolean;
  user: { id: string; email: string | null };
  isActive: boolean;
  mustChangePassword: boolean;
  roles: UserRole[];
  dealerId: string | null;
  membershipRole: "owner" | "manager" | "viewer" | null;
  dealer: DealerRow | null;
};

function emptyContext(userId: string, email: string | null): RequestAccessContext {
  return {
    emailVerified: false,
    assurance: null,
    mfaExempt: false,
    user: { id: userId, email },
    isActive: false,
    mustChangePassword: false,
    roles: [],
    dealerId: null,
    membershipRole: null,
    dealer: null,
  };
}

export async function loadAccessContextForUser(
  userId: string,
  email: string | null = null,
): Promise<RequestAccessContext> {
  const service = createSupabaseServiceClient();
  const [{ data, error }, verification, mfaExemption] = await Promise.all([
    service.rpc("get_user_access_context", { p_user_id: userId }).maybeSingle(),
    isEmailVerificationRequired()
      ? service.rpc("get_email_verification_status", { p_user_id: userId })
      : Promise.resolve({ data: false, error: null }),
    service.rpc("get_mfa_exemption_status", { p_user_id: userId }),
  ]);
  if (error) throw error;
  if (verification.error) throw new Error("E-posta doğrulama durumu alınamadı.");
  if (mfaExemption.error) throw new Error("MFA istisna durumu alınamadı.");
  if (!data) return emptyContext(userId, email);

  return {
    emailVerified: verification.data === true,
    assurance: null,
    mfaExempt: mfaExemption.data === true,
    user: { id: data.user_id, email },
    isActive: data.is_active === true,
    mustChangePassword: data.must_change_password === true,
    roles: (data.roles ?? []) as UserRole[],
    dealerId: data.dealer_id,
    membershipRole: data.membership_role as RequestAccessContext["membershipRole"],
    dealer: data.dealer as DealerRow | null,
  };
}

async function loadLocalAccessContext(): Promise<RequestAccessContext | null> {
  const user = await getLocalSessionUser();
  if (!user) return null;
  const dealerId = user.dealer_ids[0] ?? null;
  const membershipRole = user.roles
    .find((role) => role.startsWith("dealer_"))
    ?.replace("dealer_", "") as RequestAccessContext["membershipRole"] | undefined;
  const localData = dealerId ? await readLocalData() : null;
  const dealer = localData?.dealers.find((candidate) => candidate.id === dealerId && candidate.is_active) ?? null;

  return {
    emailVerified: process.env.NODE_ENV !== "production",
    assurance: "local",
    mfaExempt: false,
    user: { id: user.id, email: user.email },
    isActive: true,
    mustChangePassword: user.must_change_password,
    roles: user.roles,
    dealerId: dealer?.id ?? null,
    membershipRole: dealer ? membershipRole ?? "viewer" : null,
    dealer,
  };
}

export const getRequestAccessContext = cache(async (): Promise<RequestAccessContext | null> => {
  if (isLocalDataMode()) return loadLocalAccessContext();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;
  if (error || typeof subject !== "string" || !subject) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  const context = await loadAccessContextForUser(subject, email);
  return { ...context, assurance: getVerifiedAssurance(data.claims) };
});

export const getProtectedAccessContext = cache(async (): Promise<RequestAccessContext | null> => {
  const context = await getRequestAccessContext();
  return context?.isActive && passesEmailGate(context.emailVerified) && !context.mustChangePassword && hasRequiredAssurance(context.assurance, context.mfaExempt) ? context : null;
});
