import "server-only";

import * as Sentry from "@sentry/nextjs";
import { isLocalDataMode } from "@/lib/data-mode";
import { deleteLocalApplication } from "@/lib/local/repository";
import { createSupabaseServerClient } from "./server";
import { createSupabaseServiceClient } from "./service";

type AuthorizedDeletionScope =
  | { type: "admin" }
  | { type: "dealer"; dealerId: string };

type DeleteApplicationInput = {
  applicationId: string;
  actorUserId: string;
  scope: AuthorizedDeletionScope;
};

export type DeleteApplicationResult = {
  cleanupFailed: boolean;
};

function deletionError(error: { message?: string | null }): Error {
  if (error.message?.includes("FORBIDDEN")) return new Error("Bu başvuruyu silme yetkiniz bulunmuyor.");
  if (error.message?.includes("APPLICATION_NOT_FOUND")) return new Error("Başvuru bulunamadı veya daha önce silindi.");
  return new Error("Başvuru silinemedi. Lütfen tekrar deneyin.");
}

export async function deleteApplicationForAuthorizedActor(
  input: DeleteApplicationInput,
): Promise<DeleteApplicationResult> {
  if (isLocalDataMode()) {
    return deleteLocalApplication(
      input.applicationId,
      input.scope.type === "dealer" ? input.scope.dealerId : null,
      input.actorUserId,
    );
  }

  const authClient = await createSupabaseServerClient();
  const { data, error } = await authClient.rpc("delete_application_for_current_user", {
    p_application_id: input.applicationId,
  });

  if (error) throw deletionError(error);
  const photoPaths = data ?? [];

  if (photoPaths.length === 0) return { cleanupFailed: false };
  const service = createSupabaseServiceClient();
  const { error: cleanupError } = await service.storage.from("applications").remove(photoPaths);
  if (cleanupError) {
    Sentry.captureException(cleanupError, {
      tags: { operation: "application-photo-cleanup" },
      extra: { applicationId: input.applicationId, photoCount: photoPaths.length },
    });
  }
  return { cleanupFailed: Boolean(cleanupError) };
}
