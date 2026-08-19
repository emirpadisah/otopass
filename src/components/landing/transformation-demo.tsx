"use client";

import { useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  MessageSquareText,
  ShieldCheck,
  StickyNote,
} from "lucide-react";

const scatteredSources = [
  { label: "WhatsApp mesajları", detail: "Eksik araç bilgisi", icon: MessageSquareText },
  { label: "Excel listesi", detail: "Güncel olmayan durum", icon: FileSpreadsheet },
  { label: "Ekip notları", detail: "Belirsiz sorumluluk", icon: StickyNote },
];

const structuredSteps = [
  { label: "Başvuru alındı", detail: "Araç ve müşteri bilgileri tamamlandı" },
  { label: "Galeriye atandı", detail: "Yetkili ekip kaydı incelemeye başladı" },
  { label: "Teklif oluşturuldu", detail: "Tutar ve durum aynı kayıtta" },
];

export function TransformationDemo() {
  const [reveal, setReveal] = useState(50);
  const revealStyle = { "--reveal": `${reveal}%` } as CSSProperties;

  return (
    <div className="landing-comparison" style={revealStyle}>
      <div className="landing-comparison-stage">
        <div className="landing-before" aria-hidden={reveal >= 95}>
          <div className="landing-demo-topline">
            <div>
              <span className="landing-demo-kicker">ÖNCE</span>
              <h3>Parçalı takip</h3>
            </div>
            <span className="landing-state landing-state-muted">Manuel</span>
          </div>

          <div className="landing-source-list">
            {scatteredSources.map(({ label, detail, icon: Icon }) => (
              <div className="landing-source-row" key={label}>
                <span className="landing-source-icon">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
              </div>
            ))}
          </div>

          <div className="landing-demo-note">
            Aynı başvuru için farklı kaynakları kontrol etmek gerekir.
          </div>
        </div>

        <div className="landing-after" aria-hidden={reveal <= 5}>
          <div className="landing-demo-topline">
            <div>
              <span className="landing-demo-kicker">POL-CAR İLE</span>
              <h3>Tek kayıt, net akış</h3>
            </div>
            <span className="landing-state landing-state-success">
              <Check size={14} aria-hidden="true" /> Güncel
            </span>
          </div>

          <div className="landing-application-head">
            <div>
              <span>BAŞVURU #OP-1048</span>
              <strong>2022 Renault Clio</strong>
            </div>
            <span className="landing-state landing-state-active">Teklif aşamasında</span>
          </div>

          <div className="landing-flow-list">
            {structuredSteps.map(({ label, detail }, index) => (
              <div className="landing-flow-row" key={label}>
                <span className="landing-flow-check">
                  <CheckCircle2 size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
                {index < structuredSteps.length - 1 && <ArrowRight size={16} aria-hidden="true" />}
              </div>
            ))}
          </div>

          <div className="landing-demo-trust">
            <ShieldCheck size={17} aria-hidden="true" />
            Rol bazlı erişim ve izlenebilir durum geçmişi
          </div>
        </div>

        <div className="landing-reveal-line" aria-hidden="true">
          <span><ArrowRight size={16} /></span>
        </div>
      </div>

      <div className="landing-range-control">
        <span>Dağınık süreç</span>
        <input
          type="range"
          min="8"
          max="92"
          value={reveal}
          onChange={(event) => setReveal(Number(event.target.value))}
          aria-label="POL-CAR öncesi ve sonrası karşılaştırmasını göster"
        />
        <span>POL-CAR akışı</span>
      </div>
    </div>
  );
}
