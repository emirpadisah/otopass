import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentUserId, getDealerApplicationForCurrentUser, getUserRoles } from "@/lib/supabase/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = await getUserRoles(userId);
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");

  const service = createSupabaseServiceClient();

  const application = isAdmin
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

  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const urls: string[] = [];
  for (const path of application.photo_paths ?? []) {
    const { data, error } = await service.storage.from("applications").createSignedUrl(path, 300);
    if (!error && data?.signedUrl) {
      urls.push(data.signedUrl);
    }
  }

  return NextResponse.json({ urls });
}
