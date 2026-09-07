"use server";
import { revalidatePath } from "next/cache";
import { createOfferLink, respondPublicOffer } from "@/lib/offer-links";
export async function shareOfferAction(_state: {url?: string; message?: string}, form: FormData): Promise<{url?: string; message?: string}> {
 try { return {url:await createOfferLink(String(form.get("applicationId") ?? ""),String(form.get("message") ?? ""))}; }
 catch (error) { return {message:error instanceof Error ? error.message : "Bağlantı oluşturulamadı."}; }
}
export async function customerResponseAction(_state: {message: string}, form: FormData) {
 const token = String(form.get("token") ?? "");
 const ok = await respondPublicOffer(token,String(form.get("response") ?? ""));
 if (ok) { revalidatePath("/dealer"); revalidatePath("/dealer/applications", "layout"); revalidatePath("/teklif/" + token); }
 return {message:ok ? "Talebiniz galeriye iletildi. Galeri sizinle iletişime geçecek." : "Bağlantı artık geçerli değil. Galeriyle iletişime geçin."};
}
