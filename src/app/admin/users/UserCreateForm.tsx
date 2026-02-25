"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
} from "@/components/ui";
import { createUserAction } from "./actions";
import type { ActionResponse } from "@/lib/types";

const initialState: ActionResponse = { ok: false };

const DEALER_ROLE_SET = new Set(["dealer_owner", "dealer_manager", "dealer_viewer"]);

type DealerOption = { id: string; name: string };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "Oluşturuluyor..." : "Kullanıcıyı Oluştur"}
    </Button>
  );
}

export function UserCreateForm({ dealers }: { dealers: DealerOption[] }) {
  const [state, formAction] = useActionState(createUserAction, initialState);
  const [role, setRole] = useState("");

  const roleNeedsDealer = useMemo(() => DEALER_ROLE_SET.has(role), [role]);

  return (
    <Card tone="flat" className="border-[var(--border-soft)]">
      <CardHeader>
        <CardTitle className="text-xl">Kullanıcı Oluştur</CardTitle>
        <CardDescription>Yeni kullanıcı hesabı oluşturup rol atayın.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <Field label="E-posta" labelFor="email">
            <Input id="email" name="email" type="email" placeholder="ornek@otopass.com" required />
          </Field>

          <Field label="Ad Soyad" labelFor="fullName">
            <Input id="fullName" name="fullName" type="text" placeholder="Kullanıcı adı" />
          </Field>

          <Field
            label="Geçici Şifre"
            labelFor="password"
            className="md:col-span-2"
            description="En az 12 karakter, en az bir büyük harf, bir küçük harf ve bir sayı içermelidir."
          >
            <Input id="password" name="password" type="password" placeholder="En az 12 karakter" required />
          </Field>

          <Field label="Rol" labelFor="role">
            <Select
              id="role"
              name="role"
              required
              defaultValue=""
              onChange={(event) => setRole(event.currentTarget.value)}
            >
              <option value="" disabled>
                Rol seçin
              </option>
              <option value="admin">Admin</option>
              <option value="super_admin">Süper Admin</option>
              <option value="dealer_owner" disabled={dealers.length === 0}>
                Galeri Sahibi
              </option>
              <option value="dealer_manager" disabled={dealers.length === 0}>
                Galeri Yöneticisi
              </option>
              <option value="dealer_viewer" disabled={dealers.length === 0}>
                Galeri Görüntüleyici
              </option>
            </Select>
          </Field>

          <Field
            label="Galeri"
            labelFor="dealerId"
            description={
              dealers.length === 0
                ? "Önce Galeriler ekranından galeri oluşturun."
                : roleNeedsDealer
                  ? "Dealer rolü için galeri seçimi zorunludur."
                  : "Admin rolleri için boş bırakabilirsiniz."
            }
          >
            <Select id="dealerId" name="dealerId" defaultValue="" required={roleNeedsDealer}>
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
              className={`md:col-span-2 rounded-2xl border px-3 py-2 text-xs font-semibold ${
                state.ok
                  ? "border-[rgba(34,197,94,0.45)] bg-[rgba(34,197,94,0.12)] text-[var(--success)]"
                  : "border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.12)] text-[var(--danger)]"
              }`}
            >
              {state.message}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
