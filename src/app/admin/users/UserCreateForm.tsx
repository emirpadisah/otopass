"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, UserPlus } from "lucide-react";
import {
  Button,
  Field,
  Input,
  Select,
} from "@/components/ui";
import { createUserAction } from "./actions";
import type { ActionResponse } from "@/lib/types";

const initialState: ActionResponse = { ok: false };

const DEALER_ROLE_SET = new Set(["dealer_owner", "dealer_manager", "dealer_viewer"]);

type DealerOption = { id: string; name: string };

export function UserCreateForm({ dealers }: { dealers: DealerOption[] }) {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [dealerId, setDealerId] = useState("");

  const roleNeedsDealer = DEALER_ROLE_SET.has(role);

  return (
    <form action={formAction} className="grid gap-4" aria-busy={pending}>
          <Field label="E-posta" labelFor="email">
            <Input id="email" name="email" type="email" autoComplete="off" placeholder="kullanici@firma.com" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} disabled={pending} />
          </Field>

          <Field label="Ad soyad" labelFor="fullName">
            <Input id="fullName" name="fullName" type="text" autoComplete="off" placeholder="Ad soyad" value={fullName} onChange={(event) => setFullName(event.currentTarget.value)} disabled={pending} />
          </Field>

          <Field
            label="Geçici şifre"
            labelFor="password"
            description="En az 12 karakter, en az bir büyük harf, bir küçük harf ve bir sayı içermelidir."
          >
            <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="En az 12 karakter" required value={password} onChange={(event) => setPassword(event.currentTarget.value)} disabled={pending} />
          </Field>

          <Field label="Rol" labelFor="role">
            <Select
              id="role"
              name="role"
              required
              value={role}
              disabled={pending}
              onChange={(event) => {
                const nextRole = event.currentTarget.value;
                setRole(nextRole);
                if (!DEALER_ROLE_SET.has(nextRole)) setDealerId("");
              }}
            >
              <option value="" disabled>
                Rol seçin
              </option>
              <option value="admin">Yönetici</option>
              <option value="super_admin">Süper yönetici</option>
              <option value="dealer_owner" disabled={dealers.length === 0}>
                Galeri sahibi
              </option>
              <option value="dealer_manager" disabled={dealers.length === 0}>
                Galeri yöneticisi
              </option>
              <option value="dealer_viewer" disabled={dealers.length === 0}>
                Görüntüleyici
              </option>
            </Select>
          </Field>

          <Field
            label="Galeri"
            labelFor="dealerId"
            description={
              dealers.length === 0
                  ? "Önce Galeriler ekranından bir galeri oluşturun."
                : roleNeedsDealer
                  ? "Galeri rolleri için bu seçim zorunludur."
                  : "Yönetici rolleri için boş bırakabilirsiniz."
            }
          >
            <Select
              id="dealerId"
              name="dealerId"
              value={dealerId}
              required={roleNeedsDealer}
              disabled={!roleNeedsDealer || pending}
              onChange={(event) => setDealerId(event.currentTarget.value)}
            >
              <option value="">Galeri seçilmedi</option>
              {dealers.map((dealer) => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </option>
              ))}
            </Select>
          </Field>

          {state.message ? (
            <div
              className="status-alert"
              data-tone={state.ok ? "success" : "danger"}
              role={state.ok ? "status" : "alert"}
            >
              {state.message}
            </div>
          ) : null}

          <div>
            <Button type="submit" disabled={pending} aria-disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
              {pending ? "Hesap oluşturuluyor..." : "Kullanıcı oluştur"}
            </Button>
          </div>
    </form>
  );
}
