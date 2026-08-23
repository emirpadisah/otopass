"use client";

import { useActionState, useRef, useState } from "react";
import { ChevronDown, Plus, Save, Trash2 } from "lucide-react";
import { SocialLinkIcon } from "@/components/social-link-icon";
import { Button, Field, Input, Select } from "@/components/ui";
import {
  getDealerSocialLinks,
  getSocialPlatformOption,
  MAX_SOCIAL_LINKS,
  SOCIAL_PLATFORM_OPTIONS,
  type SocialLink,
  type SocialPlatform,
} from "@/lib/social-links";
import type { Database } from "@/lib/supabase/database.types";
import type { ActionResponse } from "@/lib/types";
import { updateDealerProfileAction } from "./actions";

type Dealer = Database["public"]["Tables"]["dealers"]["Row"];
type EditableSocialLink = SocialLink & { id: string };

export function ProfileForm({ dealer, canManage }: { dealer: Dealer; canManage: boolean }) {
  const [state, action, pending] = useActionState(updateDealerProfileAction, { ok: false } as ActionResponse);
  const initialLinks = getDealerSocialLinks(dealer).map((link, index) => ({
    ...link,
    id: `social-link-${index}`,
  }));
  const [socialLinks, setSocialLinks] = useState<EditableSocialLink[]>(initialLinks);
  const nextLinkId = useRef(initialLinks.length);

  const serializedSocialLinks = JSON.stringify(
    socialLinks.map(({ platform, url, label }) => ({
      platform,
      url,
      ...(platform === "other" ? { label } : {}),
    }))
  );

  function addSocialLink() {
    if (!canManage || socialLinks.length >= MAX_SOCIAL_LINKS) return;
    const nextPlatform =
      SOCIAL_PLATFORM_OPTIONS.find(
        (option) => option.value !== "other" && !socialLinks.some((link) => link.platform === option.value)
      )?.value ?? "other";
    const id = `social-link-${nextLinkId.current}`;
    nextLinkId.current += 1;
    setSocialLinks((current) => [...current, { id, platform: nextPlatform, url: "" }]);
  }

  function updateSocialLink(id: string, update: Partial<SocialLink>) {
    setSocialLinks((current) =>
      current.map((link) => {
        if (link.id !== id) return link;
        const nextLink = { ...link, ...update };
        if (update.platform && update.platform !== "other") delete nextLink.label;
        return nextLink;
      })
    );
  }

  function removeSocialLink(id: string) {
    setSocialLinks((current) => current.filter((link) => link.id !== id));
  }

  return (
    <form action={action} className="grid gap-6">
      <div>
        <div className="mb-4">
          <p className="ops-eyebrow">Galeri ve yetkili bilgileri</p>
          <p className="mt-1 text-xs leading-5 text-[var(--ops-muted)]">
            Yetkili bilgileri müşterilerin başvuru sayfasında doğrudan iletişim kurabilmesi için gösterilir.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Galeri adı" labelFor="name" className="sm:col-span-2">
            <Input id="name" name="name" defaultValue={dealer.name} disabled={!canManage} required />
          </Field>
          <Field label="Yetkili adı soyadı" labelFor="contactName">
            <Input
              id="contactName"
              name="contactName"
              defaultValue={dealer.contact_name ?? ""}
              disabled={!canManage}
              autoComplete="name"
              placeholder="Örn. Emir Yılmaz"
            />
          </Field>
          <Field label="Yetkili telefonu" labelFor="contactPhone" description="+905xxxxxxxxx biçiminde girin.">
            <Input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={dealer.contact_phone ?? ""}
              disabled={!canManage}
              placeholder="+905xxxxxxxxx"
            />
          </Field>
          <Field label="Müşteri iletişim e-postası" labelFor="contactEmail" description="İsteğe bağlıdır.">
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              autoComplete="email"
              defaultValue={dealer.contact_email ?? ""}
              disabled={!canManage}
            />
          </Field>
          <Field label="KVKK e-postası" labelFor="privacyEmail" description="Yasal metinlerde iletişim adresi olarak kullanılır.">
            <Input
              id="privacyEmail"
              name="privacyEmail"
              type="email"
              defaultValue={dealer.privacy_contact_email ?? ""}
              disabled={!canManage}
            />
          </Field>
        </div>
      </div>

      <div className="dealer-social-editor">
        <div className="dealer-social-editor__header">
          <div>
            <p className="ops-eyebrow">Sosyal bağlantılar</p>
            <p className="mt-1 text-xs leading-5 text-[var(--ops-muted)]">
              Müşteri formunda göstermek istediğiniz sosyal hesapları ve web bağlantılarını ekleyin.
            </p>
          </div>
          {canManage ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addSocialLink}
              disabled={socialLinks.length >= MAX_SOCIAL_LINKS}
            >
              <Plus size={15} aria-hidden="true" />
              Bağlantı ekle
            </Button>
          ) : null}
        </div>

        <input type="hidden" name="socialLinks" value={serializedSocialLinks} />

        {socialLinks.length > 0 ? (
          <div className="dealer-social-list">
            {socialLinks.map((link, index) => {
              const option = getSocialPlatformOption(link.platform);
              return (
                <div className="dealer-social-row" key={link.id}>
                  <div className="dealer-social-row__number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="dealer-social-row__icon">
                    <SocialLinkIcon platform={link.platform} />
                  </div>
                  <div className="dealer-social-row__platform">
                    <label className="sr-only" htmlFor={`${link.id}-platform`}>Platform</label>
                    <div className="dealer-social-select-wrap">
                      <Select
                        id={`${link.id}-platform`}
                        value={link.platform}
                        disabled={!canManage}
                        onChange={(event) => updateSocialLink(link.id, { platform: event.target.value as SocialPlatform })}
                      >
                        {SOCIAL_PLATFORM_OPTIONS.map((platformOption) => (
                          <option
                            key={platformOption.value}
                            value={platformOption.value}
                            disabled={
                              platformOption.value !== "other" &&
                              platformOption.value !== link.platform &&
                              socialLinks.some((item) => item.platform === platformOption.value)
                            }
                          >
                            {platformOption.label}
                          </option>
                        ))}
                      </Select>
                      <ChevronDown size={15} aria-hidden="true" />
                    </div>
                  </div>
                  {link.platform === "other" ? (
                    <div className="dealer-social-row__label">
                      <label className="sr-only" htmlFor={`${link.id}-label`}>Bağlantı adı</label>
                      <Input
                        id={`${link.id}-label`}
                        value={link.label ?? ""}
                        disabled={!canManage}
                        onChange={(event) => updateSocialLink(link.id, { label: event.target.value })}
                        placeholder="Bağlantı adı"
                        maxLength={40}
                        required
                      />
                    </div>
                  ) : null}
                  <div className="dealer-social-row__url">
                    <label className="sr-only" htmlFor={`${link.id}-url`}>{option.label} bağlantısı</label>
                    <Input
                      id={`${link.id}-url`}
                      type="url"
                      inputMode="url"
                      value={link.url}
                      disabled={!canManage}
                      onChange={(event) => updateSocialLink(link.id, { url: event.target.value })}
                      placeholder={option.placeholder}
                      maxLength={300}
                      autoComplete="url"
                      required
                    />
                  </div>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="dealer-social-row__remove"
                      onClick={() => removeSocialLink(link.id)}
                      aria-label={`${option.label} bağlantısını kaldır`}
                      title="Bağlantıyı kaldır"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  ) : <span />}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="dealer-social-empty">
            <SocialLinkIcon platform="website" size={18} />
            <p>Henüz bağlantı eklenmedi.</p>
          </div>
        )}

        <p className="text-right text-[11px] font-semibold text-[var(--ops-muted)]">
          {socialLinks.length}/{MAX_SOCIAL_LINKS} bağlantı
        </p>
      </div>

      {state.message ? (
        <div className="status-alert" data-tone={state.ok ? "success" : "danger"} role={state.ok ? "status" : "alert"}>
          {state.message}
        </div>
      ) : null}
      {canManage ? (
        <Button type="submit" disabled={pending} className="w-fit">
          <Save size={15} aria-hidden="true" />
          {pending ? "Kaydediliyor..." : "Profili kaydet"}
        </Button>
      ) : null}
    </form>
  );
}
