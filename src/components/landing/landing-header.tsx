"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, LogIn, Menu, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { href: "#faydalar", label: "Sistem faydaları" },
  { href: "#nasil-calisir", label: "Nasıl çalışır?" },
  { href: "#roller", label: "Kimler için?" },
  { href: "#guven", label: "Güven" },
];

function Brand() {
  return (
    <Link href="/" className="vc-brand" aria-label="OtoPass ana sayfa">
      <span className="vc-brand-mark" aria-hidden="true"><span>O</span><i /></span>
      <span><strong>OTOPASS</strong><small>Araç alım operasyonu</small></span>
    </Link>
  );
}

export function LandingHeader() {
  return (
    <header className="vc-header">
      <div className="vc-utility-bar">
        <div className="vc-container vc-utility-inner">
          <span>Başvurudan teklife tek akış</span>
          <div>
            <a href="#faydalar">Galeriler için</a>
            <a href="#guven"><ShieldCheck size={13} aria-hidden="true" /> Güvenli altyapı</a>
            <Link href="/login">Yetkili erişim</Link>
          </div>
        </div>
      </div>

      <div className="vc-main-nav">
        <div className="vc-container vc-main-nav-inner">
          <Brand />
          <nav className="vc-nav-links" aria-label="Ana navigasyon">
            {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
          <div className="vc-nav-actions">
            <ThemeToggle compact />
            <Link href="/login" className="vc-login-link">
              <LogIn size={16} aria-hidden="true" />
              Panele giriş
            </Link>
          </div>

          <div className="vc-mobile-actions">
            <ThemeToggle compact />
            <Dialog.Root>
              <Dialog.Trigger className="vc-icon-button" aria-label="Menüyü aç">
                <Menu size={20} aria-hidden="true" />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="vc-menu-overlay" />
                <Dialog.Content className="vc-menu-content" aria-describedby={undefined}>
                  <div className="vc-menu-head">
                    <Dialog.Title className="sr-only">OtoPass menüsü</Dialog.Title>
                    <Brand />
                    <Dialog.Close className="vc-icon-button" aria-label="Menüyü kapat"><X size={20} aria-hidden="true" /></Dialog.Close>
                  </div>
                  <nav className="vc-mobile-links" aria-label="Mobil navigasyon">
                    {navItems.map((item) => (
                      <Dialog.Close asChild key={item.href}>
                        <a href={item.href}>{item.label}<ArrowRight size={16} aria-hidden="true" /></a>
                      </Dialog.Close>
                    ))}
                  </nav>
                  <Link href="/login" className="vc-mobile-login">Panele giriş <ArrowRight size={16} aria-hidden="true" /></Link>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </div>
    </header>
  );
}
