import { NextResponse } from "next/server";
import { isLocalDataMode } from "@/lib/data-mode";
import { createLocalApplication, getLocalDealerBySlug } from "@/lib/local/repository";
import { removeLocalPhoto, saveLocalPhoto } from "@/lib/local/store";
import { createReferenceCode, sanitizeUploadName } from "@/lib/public-applications";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createRequestId, getClientIp } from "@/lib/security/request";
import { parseApplicationInput, PRIVACY_NOTICE_VERSION, validatePhotoContent, validatePhotoFiles } from "@/lib/validation/application";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers);
  const savedPaths: string[] = [];
  try {
    if (!isLocalDataMode() || process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Başvuru adresi bulunamadı.", requestId }, { status: 404 });
    }
    const formData = await request.formData();
    if (String(formData.get("website") ?? "").trim()) return NextResponse.json({ ok: true, dropped: true, requestId });
    const application = parseApplicationInput(formData);
    const files = formData.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
    validatePhotoFiles(files);
    await validatePhotoContent(files);

    const allowed = await consumeRateLimit(`${getClientIp(request.headers)}:${application.owner_phone}`, {
      scope: `public-form:${application.dealer_slug}`,
      limit: 1,
      windowSeconds: 30,
    });
    if (!allowed) return NextResponse.json({ error: "Lütfen tekrar denemeden önce bekleyin.", requestId }, { status: 429 });

    const dealer = await getLocalDealerBySlug(application.dealer_slug);
    if (!dealer || dealer.is_active === false) return NextResponse.json({ error: "Galeri başvuru kabul etmiyor.", requestId }, { status: 404 });

    for (const [index, file] of files.entries()) {
      const path = `${dealer.slug}/${Date.now()}-${index}-${crypto.randomUUID()}-${sanitizeUploadName(file.name)}.webp`;
      await saveLocalPhoto(path, new Uint8Array(await file.arrayBuffer()));
      savedPaths.push(path);
    }
    const created = await createLocalApplication({
      dealer_id: dealer.id,
      dealer_slug: dealer.slug,
      owner_name: application.owner_name,
      owner_phone: application.owner_phone,
      owner_email: application.owner_email,
      brand: application.brand,
      model: application.model,
      vehicle_package: application.vehicle_package,
      engine_info: application.engine_info,
      model_year: application.model_year,
      km: application.km,
      fuel_type: application.fuel_type,
      transmission: application.transmission,
      tramer_info: application.tramer_info,
      damage_info: application.damage_info,
      body_condition: application.body_condition,
      photo_paths: savedPaths,
      reference_code: createReferenceCode(),
      privacy_version: PRIVACY_NOTICE_VERSION,
      privacy_acknowledged_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, referenceCode: created.reference_code, requestId });
  } catch {
    await Promise.all(savedPaths.map((path) => removeLocalPhoto(path)));
    return NextResponse.json({ error: "Başvuru gönderilemedi. Bilgileri kontrol edip tekrar deneyin.", requestId }, { status: 400 });
  }
}
