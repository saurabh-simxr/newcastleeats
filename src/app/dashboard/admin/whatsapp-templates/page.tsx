import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminWhatsAppTemplates from "@/components/dashboard/admin/AdminWhatsAppTemplates";

export default async function AdminWhatsAppTemplatesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/dashboard");

  return <AdminWhatsAppTemplates />;
}
