import "server-only";

import { cache } from "react";
import { isLocalDataMode } from "@/lib/data-mode";
import { getLocalSessionUser } from "@/lib/local/auth";
import { readLocalData } from "@/lib/local/store";
import type { UserRole } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/database.types";

type DealerRow = Database["public"]["Tables"]["dealers"]["Row"];

export type RequestAccessContext = {
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
  const { data, error } = await service
    .rpc("get_user_access_context", { p_user_id: userId })
    .maybeSingle();
  if (error) throw error;
  if (!data) return emptyContext(userId, email);

  return {
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
  return loadAccessContextForUser(subject, email);
});
