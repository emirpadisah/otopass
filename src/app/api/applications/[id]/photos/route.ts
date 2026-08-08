import { NextResponse } from "next/server";
import { isLocalDataMode } from "@/lib/data-mode";
import { getLocalApplicationById } from "@/lib/local/repository";
import { readLocalPhoto } from "@/lib/local/store";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentUserId, getDealerApplicationForCurrentUser, getUserRoles } from "@/lib/supabase/queries";

function getImageContentType(photoPath: string): string {
  const extension = photoPath.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = await getUserRoles(userId);
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const localMode = isLocalDataMode();

  const application = localMode
    ? isAdmin
      ? await getLocalApplicationById(id)
      : await getDealerApplicationForCurrentUser(id)
    : await (async () => {
        const service = createSupabaseServiceClient();
        return isAdmin
          ? await (async () => {
              const { data, error } = await service
                .from("applications")
                .select("photo_paths")
                .eq("id", id)
                .maybeSingle();
              if (error) throw error;
              return data;
            })()
          : await getDealerApplicationForCurrentUser(id);
      })();

  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (localMode) {
    const requestedIndex = new URL(request.url).searchParams.get("index");
    if (requestedIndex !== null) {
      const index = Number(requestedIndex);
      const photoPath = Number.isInteger(index) ? application.photo_paths?.[index] : undefined;
      if (!photoPath) return NextResponse.json({ error: "Not found" }, { status: 404 });

      try {
        const bytes = await readLocalPhoto(photoPath);
        const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        return new Response(body, {
          headers: {
            "Content-Type": getImageContentType(photoPath),
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    return NextResponse.json({
      urls: (application.photo_paths ?? []).map(
        (_, index) => `/api/applications/${id}/photos?index=${index}`
      ),
    });
  }

  const service = createSupabaseServiceClient();

  const urls: string[] = [];
  for (const path of application.photo_paths ?? []) {
    const { data, error } = await service.storage.from("applications").createSignedUrl(path, 300);
    if (!error && data?.signedUrl) {
      urls.push(data.signedUrl);
    }
  }

  return NextResponse.json({ urls });
}
