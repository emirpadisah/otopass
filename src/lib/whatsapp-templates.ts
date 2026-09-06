import { getWhatsAppUrl } from "./phone";

export type WhatsAppTemplateInput = {
  ownerName: string | null;
  dealerName: string;
  vehicleLabel: string;
  referenceCode: string | null;
  offer: { amount: number; currency: string; notes: string | null } | null;
};

export function getWhatsAppTemplates(input: WhatsAppTemplateInput) {
  const greeting = `Merhaba${input.ownerName ? ` ${input.ownerName}` : ""}, ${input.dealerName} olarak ${input.vehicleLabel} aracınız için yaptığınız başvuruyla ilgili yazıyoruz.`;
  const reference = input.referenceCode ? `\nBaşvuru: ${input.referenceCode}` : "";
  const templates = [{
    id: "photos", label: "Ek fotoğraf iste",
    message: `${greeting}\nDeğerlendirmeyi tamamlayabilmemiz için aracınızın ön, arka, yan ve iç bölümünü gösteren net fotoğrafları bu görüşmeden paylaşabilir misiniz?${reference}`,
  }];
  if (input.offer) {
    const amount = new Intl.NumberFormat("tr-TR", { style: "currency", currency: input.offer.currency, maximumFractionDigits: 0 }).format(input.offer.amount);
    templates.unshift({
      id: "offer", label: "Teklifi paylaş",
      message: `${greeting}\nAracınız için teklifimiz: ${amount}.${input.offer.notes ? `\n${input.offer.notes}` : ""}\nTeklifimizle ilgili görüşünüzü paylaşabilir misiniz?${reference}`,
    });
  }
  return templates;
}

export function getWhatsAppMessageUrl(phone: string | null, message: string): string | null {
  const base = getWhatsAppUrl(phone);
  return base && message.trim() ? `${base}?text=${encodeURIComponent(message.trim())}` : null;
}
