import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { PanelPageHeader, buttonVariants } from "@/components/ui";
import { getCurrentUserRoles } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";
import { getDealerById } from "@/lib/supabase/queries";
import { DealerManageForm } from "./DealerManageForm";

export default async function AdminGalleryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dealer, roles] = await Promise.all([getDealerById(id), getCurrentUserRoles()]);
  if (!dealer) notFound();
  return <div><PanelPageHeader eyebrow="Yönetim / Galeri" title={dealer.name} description="Kurumsal bilgiler, KVKK iletişimi ve başvuru erişimini yönetin." icon={Building2} actions={<Link href="/admin/galleries" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}><ArrowLeft size={14} /> Listeye dön</Link>} /><div className="mt-4"><DealerManageForm dealer={dealer} canDelete={roles.includes("super_admin")} /></div></div>;
}
