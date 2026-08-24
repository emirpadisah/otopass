export type AdminUserCreationStage = "auth" | "profile" | "role" | "membership" | "audit" | "unknown";

type SupabaseLikeError = {
  message?: string;
  code?: string;
};

export class AdminUserCreationError extends Error {
  readonly code: "DUPLICATE_USER" | "CREATE_FAILED";
  readonly stage: AdminUserCreationStage;
  readonly originalError: unknown;

  constructor(
    code: "DUPLICATE_USER" | "CREATE_FAILED",
    stage: AdminUserCreationStage,
    message: string,
    originalError: unknown
  ) {
    super(message);
    this.name = "AdminUserCreationError";
    this.code = code;
    this.stage = stage;
    this.originalError = originalError;
  }
}

export function isDuplicateAuthUserError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as SupabaseLikeError;
  if (candidate.code === "email_exists" || candidate.code === "user_already_exists") return true;
  const message = candidate.message?.toLocaleLowerCase("en-US") ?? "";
  return /already\s+(?:been\s+)?registered|already\s+exists/.test(message);
}

export function toAdminUserCreationError(
  error: unknown,
  stage: AdminUserCreationStage,
  fallback: string
): AdminUserCreationError {
  if (error instanceof AdminUserCreationError) return error;
  if (isDuplicateAuthUserError(error)) {
    return new AdminUserCreationError(
      "DUPLICATE_USER",
      "auth",
      "Bu e-posta ile kayıtlı bir kullanıcı zaten var.",
      error
    );
  }
  return new AdminUserCreationError("CREATE_FAILED", stage, fallback, error);
}
