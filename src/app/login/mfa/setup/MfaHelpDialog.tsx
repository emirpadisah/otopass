"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CircleHelp, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui";

type MfaHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MfaHelpDialog({ open, onOpenChange }: MfaHelpDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="secondary" className="mt-4">
          <CircleHelp size={16} aria-hidden="true" /> MFA nasıl kullanılır?
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="ops-confirm-overlay" />
        <Dialog.Content
          className="ops-confirm-dialog mfa-dialog"
          data-tone="primary"
          style={{ maxHeight: "calc(100dvh - 2rem)", overflowY: "auto" }}
        >
          <div className="ops-confirm-topline">
            <span className="ops-confirm-icon" aria-hidden="true"><ShieldCheck size={21} /></span>
            <Dialog.Close asChild>
              <button type="button" className="ops-confirm-close" aria-label="MFA kılavuzunu kapat">
                <X size={17} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <div className="ops-confirm-copy">
            <Dialog.Title className="ops-confirm-title">MFA nasıl kullanılır?</Dialog.Title>
            <Dialog.Description className="ops-confirm-description">
              MFA, hesabınızı şifrenize ek olarak telefonunuzdaki 6 haneli kodla koruyan iki adımlı doğrulamadır.
              Kod SMS veya e-posta ile gelmez; kimlik doğrulayıcı uygulamada üretilir.
            </Dialog.Description>
          </div>

          <section className="mt-5 text-sm text-[var(--text-secondary)]" aria-label="İlk kurulum">
            <h2 className="font-semibold text-[var(--text-primary)]">İlk kez kuruyorsanız</h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5">
              <li>Telefonunuza App Store veya Google Play üzerinden Google Authenticator ya da Microsoft Authenticator uygulamasını yükleyin.</li>
              <li>
                Bu pencereyi kapatıp <strong>Kimlik doğrulayıcıyı bağla</strong> düğmesine basın.
                Authenticator uygulamasında hesap ekleme / QR kod tarama seçeneğini açıp ekrandaki QR kodu tarayın.
              </li>
              <li>
                Uygulamada <strong>otoKöprü</strong> kaydının altında görünen 6 haneli kodu bu sayfaya yazın.
                <strong> Doğrula ve devam et</strong> düğmesiyle kurulumu tamamlayın.
              </li>
            </ol>
          </section>

          <div className="panel-subtle mt-4 p-4 text-sm text-[var(--text-secondary)]">
            <h2 className="font-semibold text-[var(--text-primary)]">Aynı telefondan giriş yapıyorsanız</h2>
            <p className="mt-1">QR kodu taramak yerine altındaki kurulum anahtarını uygulamanın manuel giriş alanına yazın. Hesap adını otoKöprü, anahtar türünü zaman tabanlı seçin.</p>
          </div>

          <section className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]" aria-label="Giriş ve yardım">
            <h2 className="font-semibold text-[var(--text-primary)]">Sonraki girişlerde</h2>
            <p>Yeniden QR kod okutmanız gerekmez. Şifrenizden sonra Authenticator uygulamasını açıp güncel kodu girin. Kodun süresi dolduysa yenisini bekleyin; kabul edilmiyorsa telefonunuzun tarih ve saatini otomatik olarak ayarlayın.</p>
            <p>Eski kaydınız localhost:3000 olarak görünüyorsa kodu kullanmaya devam edebilirsiniz. Uygulamanızın hesap düzenleme seçeneğinden görünen adı otoKöprü olarak değiştirebilirsiniz; kaydı silmeniz gerekmez.</p>
            <p>Telefonunuza veya uygulamaya erişiminizi kaybederseniz sistem yöneticinizle iletişime geçin. QR kodunuzu, kurulum anahtarınızı ve doğrulama kodlarınızı kimseyle paylaşmayın.</p>
          </section>

          <div className="ops-confirm-actions mt-5">
            <Dialog.Close asChild><Button type="button">Anladım, devam et</Button></Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
