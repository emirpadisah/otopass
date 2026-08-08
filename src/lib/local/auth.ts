import { randomBytes, randomUUID } from "crypto";
import { cookies } from "next/headers";
import { isLocalUserAuthEnabled } from "@/lib/data-mode";
import {
  hashLocalPassword,
  hashLocalSessionToken,
  mutateLocalData,
  readLocalData,
  verifyLocalPassword,
  type LocalUserRecord,
} from "./store";

const LOCAL_SESSION_COOKIE = "otopass-local-session";
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const LOCAL_AUTH_DISABLED_MESSAGE = "Yerel kullanıcı işlemleri devre dışı.";

export type LocalSessionUser = Pick<
  LocalUserRecord,
  "id" | "email" | "full_name" | "must_change_password" | "roles" | "dealer_ids"
>;

function toSessionUser(user: LocalUserRecord): LocalSessionUser {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    must_change_password: user.must_change_password,
    roles: user.roles,
    dealer_ids: user.dealer_ids,
  };
}

export async function signInLocalUser(email: string, password: string): Promise<LocalSessionUser | null> {
  if (!isLocalUserAuthEnabled()) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const data = await readLocalData();
  const user = data.users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail);

  if (!user || !verifyLocalPassword(password, user.password_hash)) return null;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashLocalSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await mutateLocalData((draft) => {
    const now = Date.now();
    draft.sessions = draft.sessions.filter(
      (session) => new Date(session.expires_at).getTime() > now && session.user_id !== user.id
    );
    draft.sessions.push({ token_hash: tokenHash, user_id: user.id, expires_at: expiresAt.toISOString() });
  });

  const cookieStore = await cookies();
  cookieStore.set(LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return toSessionUser(user);
}

export async function getLocalSessionUser(): Promise<LocalSessionUser | null> {
  if (!isLocalUserAuthEnabled()) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashLocalSessionToken(token);
  const data = await readLocalData();
  const session = data.sessions.find(
    (candidate) =>
      candidate.token_hash === tokenHash && new Date(candidate.expires_at).getTime() > Date.now()
  );
  if (!session) return null;

  const user = data.users.find((candidate) => candidate.id === session.user_id);
  return user ? toSessionUser(user) : null;
}

export async function signOutLocalUser(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;

  if (token) {
    const tokenHash = hashLocalSessionToken(token);
    await mutateLocalData((data) => {
      data.sessions = data.sessions.filter((session) => session.token_hash !== tokenHash);
    });
  }

  cookieStore.delete(LOCAL_SESSION_COOKIE);
}

export async function updateLocalUserPassword(userId: string, password: string): Promise<void> {
  if (!isLocalUserAuthEnabled()) throw new Error(LOCAL_AUTH_DISABLED_MESSAGE);

  await mutateLocalData((data) => {
    const user = data.users.find((candidate) => candidate.id === userId);
    if (!user) throw new Error("Yerel kullanıcı bulunamadı.");
    user.password_hash = hashLocalPassword(password);
    user.must_change_password = false;
  });
}

export async function createLocalUser(input: {
  email: string;
  password: string;
  fullName: string | null;
  role: LocalUserRecord["roles"][number];
  dealerId?: string;
  actorUserId?: string | null;
}): Promise<void> {
  if (!isLocalUserAuthEnabled()) throw new Error(LOCAL_AUTH_DISABLED_MESSAGE);

  const normalizedEmail = input.email.trim().toLowerCase();

  await mutateLocalData((data) => {
    if (data.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      throw new Error("Bu e-posta ile kayıtlı bir kullanıcı zaten var.");
    }

    const now = new Date().toISOString();
    const userId = randomUUID();
    data.users.push({
      id: userId,
      email: normalizedEmail,
      password_hash: hashLocalPassword(input.password),
      full_name: input.fullName,
      must_change_password: true,
      roles: [input.role],
      dealer_ids: input.dealerId ? [input.dealerId] : [],
      created_at: now,
    });
    data.activity_log.push({
      id: Math.max(0, ...data.activity_log.map((item) => item.id)) + 1,
      actor_user_id: input.actorUserId ?? null,
      dealer_id: input.dealerId ?? null,
      application_id: null,
      offer_id: null,
      action: "ADMIN_USER_CREATED",
      metadata: { target_user_id: userId, role: input.role, email: normalizedEmail },
      created_at: now,
    });
  });
}
