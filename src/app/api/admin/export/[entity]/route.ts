import { requireAdminAccess } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { parsePagination } from "@/lib/pagination";
import { listAdminApplications, listAdminOffers } from "@/lib/supabase/admin-lists";
import { listDealers, listUsersForAdmin } from "@/lib/supabase/queries";

const statusLabels: Record<string, string> = {
  pending: "Bekliyor",
  offered: "Teklif verildi",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  sold: "Satıldı",
  archived: "Arşivlendi",
};

const roleLabels: Record<string, string> = {
  super_admin: "Süper yönetici",
  admin: "Yönetici",
  dealer_owner: "Galeri sahibi",
  dealer_manager: "Galeri yöneticisi",
  dealer_viewer: "Görüntüleyici",
};

function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csv(rows: unknown[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  await requireUser();
  await requireAdminAccess();
  const { entity } = await params;
  const url = new URL(request.url);
  const input = parsePagination(Object.fromEntries(url.searchParams));
  const rows: unknown[][] = [];

  if (entity === "applications") {
    let page = 1;
    let pageCount = 1;
    do {
      const data = await listAdminApplications({ ...input, page, pageSize: 100 });
      pageCount = Math.min(data.pageCount, 100);
      if (page === 1) rows.push(["Referans", "Galeri", "Ad Soyad", "Telefon", "Araç", "Durum", "Tarih"]);
      for (const item of data.items) rows.push([item.reference_code, item.dealer_name, item.owner_name, item.owner_phone, `${item.brand} ${item.model}`, statusLabels[item.status] ?? item.status, item.created_at]);
      page += 1;
    } while (page <= pageCount);
  } else if (entity === "offers") {
    let page = 1;
    let pageCount = 1;
    do {
      const data = await listAdminOffers({ ...input, page, pageSize: 100 });
      pageCount = Math.min(data.pageCount, 100);
      if (page === 1) rows.push(["Başvuru", "Galeri", "Tutar", "Para Birimi", "Durum", "Tarih"]);
      for (const item of data.items) rows.push([item.application_reference, item.dealer_name, item.amount, item.currency, statusLabels[item.status] ?? item.status, item.created_at]);
      page += 1;
    } while (page <= pageCount);
  } else if (entity === "users") {
    const query = input.q.toLocaleLowerCase("tr-TR");
    const users = (await listUsersForAdmin())
      .filter((user) => !input.status || (input.status === "active" ? user.is_active : !user.is_active))
      .filter((user) => !query || [user.email, user.full_name, ...user.roles].some((value) => value?.toLocaleLowerCase("tr-TR").includes(query)))
      .sort((a, b) => input.sort === "oldest" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
    rows.push(["E-posta", "Ad soyad", "Roller", "Aktif", "Oluşturulma"]);
    users.forEach((user) => rows.push([user.email, user.full_name, user.roles.map((role) => roleLabels[role] ?? role).join(";"), user.is_active ? "Evet" : "Hayır", user.created_at]));
  } else if (entity === "galleries") {
    const query = input.q.toLocaleLowerCase("tr-TR");
    const dealers = (await listDealers())
      .filter((dealer) => !input.status || (input.status === "active" ? dealer.is_active : !dealer.is_active))
      .filter((dealer) => !query || [dealer.name, dealer.slug, dealer.contact_email, dealer.legal_name].some((value) => value?.toLocaleLowerCase("tr-TR").includes(query)))
      .sort((a, b) => input.sort === "oldest" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
    rows.push(["Galeri", "Başvuru kodu", "İletişim", "KVKK", "Aktif", "Oluşturulma"]);
    dealers.forEach((dealer) => rows.push([dealer.name, dealer.slug, dealer.contact_email, dealer.privacy_contact_email, dealer.is_active ? "Evet" : "Hayır", dealer.created_at]));
  } else {
    return new Response("Kayıt türü bulunamadı.", { status: 404 });
  }

  return new Response(csv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="otokopru-${entity}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
