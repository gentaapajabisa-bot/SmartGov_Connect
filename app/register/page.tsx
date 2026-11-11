import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import Header from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daftar - SmartGov Connect" };

export default async function RegisterPage() {
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect("/dashboard");

  return (
    <>
      <Header />
      <main className="auth-wrap">
        <div className="card auth-card">
          <h1 style={{ fontSize: "1.4rem" }}>Daftar Warga</h1>
          <p style={{ color: "var(--muted)" }}>Akun petugas dan admin dibuat oleh admin kelurahan.</p>
          <AuthForm mode="register" />
        </div>
      </main>
    </>
  );
}
