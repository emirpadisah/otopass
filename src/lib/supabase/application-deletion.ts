import "server-only";

import * as Sentry from "@sentry/nextjs";
import { isLocalDataMode } from "@/lib/data-mode";
import { deleteLocalApplication } from "@/lib/local/repository";
import { createSupabaseServerClient } from "./server";
import { createSupabaseServiceClient } from "./service";
import { isMissingFunction } from "./schema-compat";

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

async function deleteWithCompatibilityPath(input: DeleteApplicationInput): Promise<string[]> {
  const service = createSupabaseServiceClient();
  let query = service
    .from("applications")
    .select("id, dealer_id, reference_code, brand, model, status, photo_paths")
    .eq("id", input.applicationId);
  if (input.scope.type === "dealer") query = query.eq("dealer_id", input.scope.dealerId);

  const { data: application, error: readError } = await query.maybeSingle();
  if (readError) throw readError;
  if (!application) throw new Error("Başvuru bulunamadı veya bu işlem için yetkiniz yok.");

  const metadata = {
    application_id: application.id,
    reference_code: application.reference_code,
    vehicle: `${application.brand} ${application.model}`,
    previous_status: application.status,
    photo_count: application.photo_paths.length,
    compatibility_path: true,
  };
  const { error: requestAuditError } = await service.from("activity_log").insert({
    actor_user_id: input.actorUserId,
    dealer_id: application.dealer_id,
    application_id: application.id,
    action: "APPLICATION_DELETE_REQUESTED",
    metadata,
  });
  if (requestAuditError) throw requestAuditError;

  const { error: deleteError } = await service.from("applications").delete().eq("id", application.id);
  if (deleteError) throw deleteError;

  const { error: completionAuditError } = await service.from("activity_log").insert({
    actor_user_id: input.actorUserId,
    dealer_id: application.dealer_id,
    application_id: null,
    action: "APPLICATION_DELETED",
    metadata,
  });
  if (completionAuditError) Sentry.captureException(completionAuditError, { tags: { operation: "application-delete-audit" } });
  return application.photo_paths;
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

  let photoPaths: string[];
  if (!error) {
    photoPaths = data ?? [];
  } else if (isMissingFunction(error, "delete_application_for_current_user")) {
    photoPaths = await deleteWithCompatibilityPath(input);
  } else {
    throw deletionError(error);
  }

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
