import type { Metadata } from "next";
import { readPublicOffer } from "@/lib/offer-links";
import { ResponseForm } from "./ResponseForm";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {title:"Size özel araç teklifi | otoköprü", robots:{index:false,follow:false}, referrer:"no-referrer"};
export default async function PublicOfferPage({params}:{params:Promise<{token:string}>}) {
 const {token} = await params;
 const offer = await readPublicOffer(token);
 return <main className="mx-auto max-w-2xl px-5 py-14">
 {!offer ? <section className="panel-surface rounded-2xl p-8"><h1 className="text-2xl font-bold">Teklif bağlantısı kullanılamıyor</h1><p className="mt-4">Bağlantının süresi dolmuş veya teklif sonuçlanmış olabilir. Güncel teklif için galeriyle iletişime geçin.</p></section> :
 <section className="panel-surface space-y-6 rounded-2xl border p-8">
 <p className="text-sm">{offer.dealerName}</p><h1 className="text-2xl font-bold">Aracınıza özel teklif</h1>
 <p>{offer.vehicle}{offer.km !== null ? " · " + new Intl.NumberFormat("tr-TR").format(offer.km) + " km" : ""}</p>
 <p className="text-4xl font-bold">{new Intl.NumberFormat("tr-TR",{style:"currency",currency:offer.currency,maximumFractionDigits:0}).format(offer.amount)}</p>
 {offer.message ? <p className="whitespace-pre-wrap">{offer.message}</p> : null}
 <p className="text-sm">Son geçerlilik: {new Date(offer.expiresAt).toLocaleDateString("tr-TR")}. Bu bir ön değerlendirmedir; nihai tutar fiziki ekspertiz sonrası netleşir.</p>
 {offer.response ? <p role="status">Talebiniz galeriye iletildi. Galeri sizinle iletişime geçecek.</p> : <ResponseForm token={token}/>}
 <p className="text-xs text-[var(--text-muted)]">Yanıtınız görüşme talebidir; satış veya teklif kabulü anlamına gelmez.</p>
 </section>}
 </main>;
}
