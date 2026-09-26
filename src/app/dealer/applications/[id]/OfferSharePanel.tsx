"use client";

import type { ComponentProps } from "react";
import { FileImage } from "lucide-react";
import { OfferShareCard, PanelSection } from "@/components/ui";
import { useOfferPageState } from "./OfferPageState";

type ShareProps = ComponentProps<typeof OfferShareCard>;

export function OfferSharePanel({
  base,
  currentOffer,
}: {
  base: Omit<ShareProps, "amount" | "currency" | "notes" | "createdAt">;
  currentOffer: Pick<ShareProps, "amount" | "currency" | "notes" | "createdAt"> | null;
}) {
  const { createdOffer } = useOfferPageState();
  const offer = createdOffer ?? currentOffer;
  if (!offer) return null;

  return (
    <PanelSection
      title="Paylaşılabilir teklif özeti"
      description="Başvuru ve teklif bilgilerinden otomatik hazırlanan indirilebilir görsel"
      icon={FileImage}
    >
      <OfferShareCard {...base} amount={offer.amount} currency={offer.currency} notes={offer.notes} createdAt={offer.createdAt} />
    </PanelSection>
  );
}
