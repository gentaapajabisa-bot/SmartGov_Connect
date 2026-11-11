import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import AuthShell from "@/components/AuthShell";
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
      <AuthShell heading="Daftar Warga" blurb="Akun petugas dan admin dibuat oleh admin kelurahan.">
        <AuthForm mode="register" />
      </AuthShell>
    </>
  );
}
