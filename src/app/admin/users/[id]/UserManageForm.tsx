"use client";

import { useActionState, useEffect, useRef } from "react";
import { KeyRound, LoaderCircle, Save, Trash2 } from "lucide-react";
import { Button, ConfirmSubmitButton, Field, Input } from "@/components/ui";
import type { ActionResponse, UserRole } from "@/lib/types";
import { deleteUserAction, setUserPasswordAction, updateUserAction } from "../actions";

type UserData = { user_id: string; full_name: string | null; roles: string[]; dealer_ids: string[]; is_active: boolean };
const initial: ActionResponse = { ok: false };

function Message({ state }: { state: ActionResponse }) {
  return state.message ? <div className="status-alert" data-tone={state.ok ? "success" : "danger"} role={state.ok ? "status" : "alert"}>{state.message}</div> : null;
}

export function UserManageForm({ user, dealers, canDelete }: { user: UserData; dealers: Array<{ id: string; name: string }>; canDelete: boolean }) {
  const [updateState, updateAction, updatePending] = useActionState(updateUserAction, initial);
  const [passwordState, passwordAction, passwordPending] = useActionState(setUserPasswordAction, initial);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteUserAction, initial);
  const passwordFormRef = useRef<HTMLFormElement>(null);
  const role = (user.roles[0] || "dealer_viewer") as UserRole;
  const deleteFormId = `delete-user-${user.user_id}`;

  useEffect(() => {
    if (!passwordState.ok) return;
    passwordFormRef.current?.reset();
  }, [passwordState.ok]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <form action={updateAction} className="panel space-y-4 p-5 sm:p-6">
        <input type="hidden" name="userId" value={user.user_id} />
        <Field label="Ad soyad" labelFor="fullName"><Input id="fullName" name="fullName" defaultValue={user.full_name ?? ""} /></Field>
        <Field label="Rol" labelFor="role"><select id="role" name="role" className="input-base" defaultValue={role}><option value="super_admin">Süper yönetici</option><option value="admin">Yönetici</option><option value="dealer_owner">Galeri sahibi</option><option value="dealer_manager">Galeri yöneticisi</option><option value="dealer_viewer">Görüntüleyici</option></select></Field>
        <Field label="Galeri" labelFor="dealerId"><select id="dealerId" name="dealerId" className="input-base" defaultValue={user.dealer_ids[0] ?? ""}><option value="">Galeri yok</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</select></Field>
        <label className="checkbox-row"><input type="checkbox" name="isActive" defaultChecked={user.is_active} /><span>Hesap aktif</span></label>
        <Message state={updateState} />
        <Button type="submit" disabled={updatePending}><Save size={15} /> Değişiklikleri kaydet</Button>
      </form>
      <aside className="space-y-4">
        <form ref={passwordFormRef} action={passwordAction} className="panel space-y-4 p-5" aria-busy={passwordPending}>
          <input type="hidden" name="userId" value={user.user_id} />
          <div>
            <h2 className="font-bold">Şifre değiştir</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Geçici şifre atayın. Kullanıcı ilk girişte kendi şifresini belirler.</p>
          </div>
          <Field label="Yeni geçici şifre" labelFor="password" description="En az 12 karakter; büyük harf, küçük harf ve sayı içermelidir.">
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={passwordPending} />
          </Field>
          <Field label="Yeni şifreyi doğrulayın" labelFor="passwordConfirmation">
            <Input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={passwordPending} />
          </Field>
          <Message state={passwordState} />
          <Button type="submit" variant="secondary" disabled={passwordPending}>
            {passwordPending ? <LoaderCircle className="animate-spin" size={15} aria-hidden="true" /> : <KeyRound size={15} aria-hidden="true" />}
            {passwordPending ? "Şifre güncelleniyor..." : "Şifreyi güncelle"}
          </Button>
        </form>
        {canDelete ? <form id={deleteFormId} action={deleteAction} className="panel space-y-4 border-[var(--danger)] p-5"><input type="hidden" name="userId" value={user.user_id} /><h2 className="font-bold text-[var(--danger)]">Kalıcı silme</h2><Message state={deleteState} /><ConfirmSubmitButton formId={deleteFormId} title="Kullanıcı kalıcı olarak silinsin mi?" description="Hesap, rol ve galeri üyelikleri sistemden kaldırılacak." confirmLabel="Kullanıcıyı kalıcı olarak sil" details={["Kullanıcı artık giriş yapamaz", "Rol ve galeri erişimleri kaldırılır", "Bu işlem geri alınamaz"]} feedbackMessage={deleteState.message} feedbackTone={deleteState.ok ? "success" : "danger"} tone="danger" variant="danger" disabled={deletePending}><Trash2 size={15} /> Kullanıcıyı sil</ConfirmSubmitButton></form> : null}
      </aside>
    </div>
  );
}
