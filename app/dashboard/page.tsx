import { redirect } from "next/navigation";
import AdminPanel from "@/components/AdminPanel";
import CitizenView from "@/components/CitizenView";
import Header from "@/components/Header";
import VerifyBanner from "@/components/VerifyBanner";
import StaffView from "@/components/StaffView";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard - SmartGov Connect" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const heading =
    user.role === "warga" ? "Pengaduan Saya" : user.role === "petugas" ? "Laporan Masuk" : "Panel Admin";

  return (
    <>
      <Header user={user} />
      <main className="container dash page-in">
        <h1>{heading}</h1>
        <p className="sub">Selamat datang, {user.name}.</p>
        {!user.email_verified && <VerifyBanner />}
        {user.role === "warga" && <CitizenView />}
        {user.role === "petugas" && <StaffView userId={user.id} />}
        {user.role === "admin" && <AdminPanel currentUserId={user.id} />}
      </main>
    </>
  );
}
