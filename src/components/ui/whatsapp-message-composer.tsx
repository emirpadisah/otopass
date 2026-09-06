"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "./button";
import { Field, Textarea } from "./input";
import { getWhatsAppMessageUrl, getWhatsAppTemplates, type WhatsAppTemplateInput } from "@/lib/whatsapp-templates";
import { cn } from "@/lib/cn";

export function WhatsAppMessageComposer({ phone, ...input }: WhatsAppTemplateInput & { phone: string | null }) {
  const templates = getWhatsAppTemplates(input);
  const [selected, setSelected] = useState(templates[0].id);
  const [message, setMessage] = useState(templates[0].message);
  const href = getWhatsAppMessageUrl(phone, message);

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2" aria-label="Hazır mesajlar">
      {templates.map((template) => <Button key={template.id} type="button" size="sm"
        variant={selected === template.id ? "primary" : "secondary"} aria-pressed={selected === template.id}
        onClick={() => { setSelected(template.id); setMessage(template.message); }}>
        {template.label}
      </Button>)}
    </div>
    <Field label="WhatsApp mesajı" labelFor="whatsapp-message" description="Mesajı düzenleyin, ardından WhatsApp üzerinden gönderin.">
      <Textarea id="whatsapp-message" rows={7} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={6000} />
    </Field>
    {href ? <a className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex gap-2")} href={href} target="_blank" rel="noreferrer">
      <MessageCircle size={15} aria-hidden="true" /> WhatsApp’ta aç
    </a> : <p className="text-sm text-[var(--text-muted)]">{message.trim() ? "Geçerli bir telefon numarası bulunmuyor." : "Mesajınızı yazın."}</p>}
  </div>;
}
