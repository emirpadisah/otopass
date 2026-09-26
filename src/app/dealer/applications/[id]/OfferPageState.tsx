"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { StatusBadge } from "@/components/ui";

type CreatedOffer = { id: string; amount: number; currency: string; notes: string | null; createdAt: string };

type OfferPageContext = {
  status: string;
  createdOffer: CreatedOffer | null;
  setCreatedOffer: (offer: CreatedOffer) => void;
};

const Context = createContext<OfferPageContext | null>(null);

export function OfferPageState({ initialStatus, children }: { initialStatus: string; children: ReactNode }) {
  const [createdOffer, setCreatedOffer] = useState<CreatedOffer | null>(null);
  return (
    <Context.Provider value={{ status: createdOffer ? "offered" : initialStatus, createdOffer, setCreatedOffer }}>
      {children}
    </Context.Provider>
  );
}

export function useOfferPageState() {
  const context = useContext(Context);
  if (!context) throw new Error("Teklif sayfası durumu bulunamadı.");
  return context;
}

export function OfferStatusBadge() {
  const { status } = useOfferPageState();
  return <StatusBadge status={status} />;
}
