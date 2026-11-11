import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import AuthShell from "@/components/AuthShell";
import Header from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Masuk - SmartGov Connect" };

export default async function LoginPage() {
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect("/dashboard");

  return (
    <>
      <Header />
      <AuthShell heading="Masuk" blurb="Gunakan akun warga, petugas, atau admin.">
        <AuthForm mode="login" />
      </AuthShell>
    </>
  );
}
