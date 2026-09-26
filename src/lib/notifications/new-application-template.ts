export type NewApplicationNotification = {
  id: string;
  dealerId: string;
  referenceCode: string | null;
  brand: string;
  model: string;
  modelYear: number | null;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function buildNewApplicationEmail(application: NewApplicationNotification, siteOrigin: string) {
  const vehicle = [application.brand, application.model, application.modelYear].filter(Boolean).join(" ");
  const reference = application.referenceCode ?? "-";
  const detailUrl = `${siteOrigin}/dealer/applications/${encodeURIComponent(application.id)}`;
  return {
    subject: "Yeni araç başvurusu geldi | OtoKöprü",
    text: `Galerinize yeni bir araç başvurusu geldi.\n\nAraç: ${vehicle}\nBaşvuru referansı: ${reference}\n\nBaşvuruyu görüntüle: ${detailUrl}\n\nDetayları görmek için galeri hesabınızla giriş yapın.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171717;line-height:1.6"><h1 style="font-size:24px">Yeni araç başvurusu geldi</h1><p>Galerinize yeni bir araç başvurusu ulaştı.</p><p><strong>Araç:</strong> ${escapeHtml(vehicle)}<br><strong>Başvuru referansı:</strong> ${escapeHtml(reference)}</p><p><a href="${escapeHtml(detailUrl)}" style="display:inline-block;background:#171717;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Başvuruyu görüntüle</a></p><p style="color:#666;font-size:13px">Detayları görmek için galeri hesabınızla giriş yapın.</p></div>`,
  };
}
