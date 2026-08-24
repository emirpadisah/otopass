"use client";

import { FormEvent, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Mail,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";

const contactPhoneDisplay = "+90 553 684 58 21";
const contactPhoneHref = "+905536845821";
const contactWhatsAppNumber = "905536845821";
const contactEmail = "info@otokopru.com";

export function ContactSection() {
  const [status, setStatus] = useState<string | null>(null);

  function submitContactForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (String(formData.get("website") || "").trim()) {
      form.reset();
      setStatus("Mesajınız hazırlandı.");
      return;
    }

    const name = String(formData.get("name") || "").trim();
    const contact = String(formData.get("contact") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const whatsappMessage = [
      "Merhaba, otoköprü hakkında bilgi almak istiyorum.",
      "",
      `Ad soyad: ${name}`,
      `İletişim: ${contact}`,
      `Mesaj: ${message}`,
    ].join("\n");
    const whatsappUrl = `https://wa.me/${contactWhatsAppNumber}?text=${encodeURIComponent(whatsappMessage)}`;

    const openedWindow = window.open(whatsappUrl, "_blank");
    if (openedWindow) openedWindow.opener = null;
    else window.location.href = whatsappUrl;
    setStatus("WhatsApp görüşmesi açıldı. Mesajı kontrol edip gönderimi tamamlayabilirsiniz.");
  }

  return (
    <section className="vc-section vc-contact-section" id="iletisim">
      <div className="vc-container">
        <div className="vc-centered-heading" data-reveal>
          <span className="vc-section-kicker">Bizimle iletişime geçin</span>
          <h2>Galeriniz için otoköprü&apos;yü konuşalım</h2>
          <p>Sorularınızı doğrudan iletin; kullanım kapsamını ve kurulum sürecini birlikte değerlendirelim.</p>
        </div>

        <div className="vc-contact-shell" data-reveal>
          <aside className="vc-contact-details" aria-label="İletişim bilgileri">
            <div className="vc-contact-details-heading">
              <span><MessageCircle size={21} aria-hidden="true" /></span>
              <div><small>Doğrudan iletişim</small><h3>Size ulaşabileceğimiz yolu seçin</h3></div>
            </div>
            <p>Satış, kurulum ve sistem kapsamıyla ilgili sorularınız için telefon veya e-posta üzerinden bize ulaşabilirsiniz.</p>

            <div className="vc-contact-links">
              <a href={`tel:${contactPhoneHref}`}>
                <span><Phone size={19} aria-hidden="true" /></span>
                <span><small>Telefon</small><strong dir="ltr">{contactPhoneDisplay}</strong></span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
              <a href={`mailto:${contactEmail}`}>
                <span><Mail size={19} aria-hidden="true" /></span>
                <span><small>E-posta</small><strong>{contactEmail}</strong></span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>

            <div className="vc-contact-assurance">
              <CheckCircle2 size={17} aria-hidden="true" />
              <span><strong>Gerçek bir kişiyle görüşün</strong><small>Talebiniz doğrudan otoköprü ekibine ulaşır.</small></span>
            </div>
          </aside>

          <div className="vc-contact-form-wrap">
            <div className="vc-contact-form-heading">
              <span>Görüşme talebi</span>
              <h3>Kısaca ihtiyacınızı anlatın</h3>
              <p>Formu tamamladığınızda mesajınız WhatsApp&apos;ta gönderime hazır olarak açılır.</p>
            </div>

            <form className="vc-contact-form" onSubmit={submitContactForm}>
              <div>
                <label htmlFor="contact-name">Ad soyad</label>
                <input id="contact-name" name="name" type="text" autoComplete="name" placeholder="Adınız ve soyadınız" required />
              </div>
              <div>
                <label htmlFor="contact-channel">Telefon veya e-posta</label>
                <input id="contact-channel" name="contact" type="text" autoComplete="email" placeholder="+90 5xx xxx xx xx veya ad@galeri.com" required />
              </div>
              <div className="vc-contact-field-wide">
                <label htmlFor="contact-message">Mesajınız</label>
                <textarea id="contact-message" name="message" rows={5} placeholder="Galeriniz ve ihtiyacınız hakkında kısa bilgi verin." required />
              </div>
              <div className="vc-contact-honeypot" aria-hidden="true">
                <label htmlFor="contact-website">Web sitesi</label>
                <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <button type="submit" className="vc-contact-submit">
                WhatsApp&apos;ta gönder <Send size={16} aria-hidden="true" />
              </button>
              <p className="vc-contact-consent">Gönder düğmesi WhatsApp&apos;ı açar; mesaj yalnızca gönderimi tamamladığınızda iletilir.</p>
              {status ? <p className="vc-contact-status" role="status"><CheckCircle2 size={15} aria-hidden="true" />{status}</p> : null}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
