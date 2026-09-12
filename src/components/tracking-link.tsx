"use client";

import { useState } from "react";
import { Copy, ArrowUpRight } from "lucide-react";
import { Button, Input, buttonVariants } from "@/components/ui";

export function TrackingLink({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  const [showLink, setShowLink] = useState(false);
  return <div className="grid w-full min-w-0 justify-items-center gap-3">
      <a href={url} className={`${buttonVariants({ size: "lg" })} intake-track-button`}>Başvurumu takip et <ArrowUpRight size={16} aria-hidden="true" /></a>
      <Button type="button" variant="ghost" size="sm" onClick={async () => {
        try { await navigator.clipboard.writeText(url); setMessage("Bağlantı kopyalandı."); }
        catch { setShowLink(true); setMessage("Bağlantıyı aşağıdaki alandan kopyalayabilirsiniz."); }
      }}><Copy size={15} aria-hidden="true" /> Bağlantıyı kopyala</Button>
    <p className="text-xs text-[var(--text-muted)]">Daha sonra da takip edebilmek için bağlantınızı saklayın.</p>
    {message ? <p role="status" className="text-sm">{message}</p> : null}
    {showLink ? <Input aria-label="Başvuru takip bağlantınız" readOnly value={url} onFocus={event => event.target.select()} /> : null}
  </div>;
}
