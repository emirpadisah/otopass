import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { getWhatsAppUrl } from "@/lib/phone";

export function WhatsAppPhoneLink({
  className,
  phone,
}: {
  className?: string;
  phone: string | null | undefined;
}) {
  const href = getWhatsAppUrl(phone);
  if (!href || !phone) return <span>-</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn("ops-whatsapp-link", className)}
      aria-label={`${phone} numarasıyla WhatsApp görüşmesi başlat`}
    >
      <span dir="ltr">{phone}</span>
      <MessageCircle size={14} aria-hidden="true" />
    </a>
  );
}
