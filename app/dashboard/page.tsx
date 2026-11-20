import { redirect } from "next/navigation";
import AdminPanel from "@/components/AdminPanel";
import StaffView from "@/components/StaffView";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard - SmartGov Connect" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "petugas") {
    return <StaffView userId={user.id} userName={user.name} />;
  }
  return <AdminPanel currentUserId={user.id} currentUserName={user.name} />;
}
