"use client";

import { HandCoins } from "lucide-react";
import { PanelSection } from "@/components/ui";
import { OfferDecisionForm } from "./OfferDecisionForm";
import { OfferForm } from "./OfferForm";
import { useOfferPageState } from "./OfferPageState";
import { SoldButtonForm } from "../SoldButtonForm";

export function OfferWorkflowPanel({
  applicationId,
  currentOffer,
}: {
  applicationId: string;
  currentOffer: { id: string; amount: number; currency: string } | null;
}) {
  const { status, createdOffer } = useOfferPageState();
  const offer = createdOffer ?? currentOffer;

  return (
    <PanelSection
      title={status === "pending" || status === "rejected" ? "Teklif oluştur" : "Teklif süreci"}
      description="Teklif, müşteri yanıtı ve satın alma sonucunu kaydedin"
      icon={HandCoins}
    >
      {status === "pending" || status === "rejected" ? (
        <OfferForm applicationId={applicationId} />
      ) : status === "offered" && offer ? (
        <div className="space-y-4">
          {createdOffer ? <div className="status-alert" data-tone="success" role="status">Teklif başarıyla oluşturuldu.</div> : null}
          <div className="panel-subtle p-4">
            <p className="text-xs text-[var(--text-muted)]">Yanıt bekleyen teklif</p>
            <p className="mt-1 text-xl font-bold">
              {new Intl.NumberFormat("tr-TR", { style: "currency", currency: offer.currency, maximumFractionDigits: 0 }).format(offer.amount)}
            </p>
          </div>
          <OfferDecisionForm applicationId={applicationId} offerId={offer.id} />
        </div>
      ) : status === "accepted" ? (
        <div className="space-y-4">
          <div className="status-alert" data-tone="success">Müşteri teklifi kabul etti. Araç devri tamamlandığında satışı kapatın.</div>
          <SoldButtonForm applicationId={applicationId} />
        </div>
      ) : (
        <div className="status-alert" role="status">Bu başvuruda bekleyen bir işlem bulunmuyor.</div>
      )}
    </PanelSection>
  );
}
