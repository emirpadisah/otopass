"use client";

import { useActionState } from "react";
import { startApplicationReviewAction } from "@/app/dealer/applications/[id]/tracking-actions";
import { Button } from "./button";

export function ApplicationReviewButton({ applicationId }: { applicationId: string }) {
  const [state, action, pending] = useActionState(startApplicationReviewAction, {});
  return <form action={action} className="mb-4 grid gap-2">
    <input type="hidden" name="applicationId" value={applicationId} />
    <Button type="submit" disabled={pending} variant="secondary" size="sm">{pending ? "Kaydediliyor…" : "İncelemeyi başlat"}</Button>
    {state.message ? <p role={state.ok ? "status" : "alert"} className="text-sm">{state.message}</p> : null}
  </form>;
}
