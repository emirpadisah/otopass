import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserCog } from "lucide-react";
import { PanelPageHeader, buttonVariants } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getCurrentUserRoles } from "@/lib/auth/roles";
import { getAdminUser, listDealerOptionsForAdmin } from "@/lib/supabase/queries";
import { UserManageForm } from "./UserManageForm";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, dealers, roles] = await Promise.all([getAdminUser(id), listDealerOptionsForAdmin(), getCurrentUserRoles()]);
  if (!user) notFound();
  return <div><PanelPageHeader eyebrow="Kullanıcılar / Detay" title={user.full_name || user.email || "Kullanıcı"} description="Kullanıcının rolünü, galeri üyeliğini ve hesap durumunu yönetin." icon={UserCog} actions={<Link href="/admin/users" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}><ArrowLeft size={14} /> Listeye dön</Link>} /><div className="mt-4"><UserManageForm user={user} dealers={dealers} canDelete={roles.includes("super_admin")} /></div></div>;
}
