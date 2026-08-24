import { describe, expect, it } from "vitest";
import { isDuplicateAuthUserError, toAdminUserCreationError } from "@/lib/supabase/admin-user-errors";

describe("admin user creation errors", () => {
  it("recognizes current Supabase duplicate email errors", () => {
    expect(isDuplicateAuthUserError({ code: "email_exists", message: "A user with this email address has already been registered" })).toBe(true);
    expect(isDuplicateAuthUserError({ message: "User already exists" })).toBe(true);
  });

  it("keeps downstream failures generic and tagged by stage", () => {
    const error = toAdminUserCreationError({ code: "42501", message: "permission denied" }, "role", "Kullanıcı rolü atanamadı.");
    expect(error.code).toBe("CREATE_FAILED");
    expect(error.stage).toBe("role");
    expect(error.message).toBe("Kullanıcı rolü atanamadı.");
  });
});
