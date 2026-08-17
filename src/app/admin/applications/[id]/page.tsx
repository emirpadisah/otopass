import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, ClipboardList, HandCoins } from "lucide-react";
import { PanelPageHeader, PanelSection, StatusBadge, buttonVariants } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export default async function AdminApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  const [{ data: application }, { data: offers }] = await Promise.all([
    supabase.from("applications").select("*").eq("id", id).maybeSingle(),
    supabase.from("offers").select("*").eq("application_id", id).order("created_at", { ascending: false }),
  ]);
  if (!application) notFound();
  const { data: dealer } = await supabase.from("dealers").select("name").eq("id", application.dealer_id).maybeSingle();
  const photos = await Promise.all(application.photo_paths.map(async (path) => (await supabase.storage.from("applications").createSignedUrl(path, 300)).data?.signedUrl || null));
  return <div><PanelPageHeader eyebrow="Yönetim / Başvuru" title={`${application.brand} ${application.model}`} description={`${dealer?.name || "Galeri"} · ${application.reference_code}`} icon={ClipboardList} meta={<StatusBadge status={application.status} />} actions={<Link href="/admin/applications" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}><ArrowLeft size={14} /> Listeye dön</Link>} />
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]"><PanelSection title="Başvuru bilgileri" icon={ClipboardList}><dl className="ops-info-list"><div className="ops-info-row"><dt>Müşteri</dt><dd>{application.owner_name}</dd></div><div className="ops-info-row"><dt>İletişim</dt><dd>{application.owner_email}<br />{application.owner_phone}</dd></div><div className="ops-info-row"><dt>Araç</dt><dd>{application.brand} {application.model} {application.vehicle_package}</dd></div><div className="ops-info-row"><dt>Yıl / KM</dt><dd>{application.model_year || "-"} / {application.km || "-"}</dd></div><div className="ops-info-row"><dt>KVKK sürümü</dt><dd>{application.privacy_version || "-"}</dd></div></dl></PanelSection>
      <PanelSection title="Teklif geçmişi" icon={HandCoins}>{offers?.length ? <div className="space-y-3">{offers.map((offer) => <div key={offer.id} className="panel-subtle p-4"><div className="flex justify-between gap-3"><strong>{new Intl.NumberFormat("tr-TR", { style: "currency", currency: offer.currency, maximumFractionDigits: 0 }).format(offer.amount)}</strong><StatusBadge status={offer.status} /></div><p className="mt-2 text-xs text-[var(--text-muted)]">{offer.notes || "Not yok"}</p></div>)}</div> : <p className="text-sm text-[var(--text-muted)]">Teklif bulunmuyor.</p>}</PanelSection></div>
    <PanelSection className="mt-4" title="Fotoğraflar" icon={Camera}>{photos.some(Boolean) ? <div className="ops-photo-grid">{photos.filter((url): url is string => Boolean(url)).map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="ops-photo"><Image src={url} alt={`Araç fotoğrafı ${index + 1}`} width={900} height={600} unoptimized /></a>)}</div> : <p className="text-sm text-[var(--text-muted)]">Fotoğraf bulunmuyor.</p>}</PanelSection>
  </div>;
}
