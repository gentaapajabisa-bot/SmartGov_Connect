import AuthShell from "@/components/AuthShell";
import Header from "@/components/Header";
import VerifyEmail from "@/components/VerifyEmail";

export const metadata = { title: "Verifikasi Email - SmartGov Connect", robots: { index: false } };

export default function VerifyPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <>
      <Header />
      <AuthShell heading="Verifikasi email" blurb="Konfirmasi bahwa alamat email ini milik Anda.">
        <VerifyEmail token={typeof searchParams.token === "string" ? searchParams.token : ""} />
      </AuthShell>
    </>
  );
}
