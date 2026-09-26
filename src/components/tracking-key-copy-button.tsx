"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui";

export function TrackingKeyCopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return <Button type="button" variant="secondary" size="sm" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Kopyalandı" : "Anahtarı kopyala"}</Button>;
}
