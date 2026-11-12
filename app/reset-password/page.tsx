import AuthShell from "@/components/AuthShell";
import Header from "@/components/Header";
import ResetForm from "@/components/ResetForm";

export const metadata = { title: "Atur Ulang Kata Sandi - SmartGov Connect", robots: { index: false } };

export default function ResetPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <>
      <Header />
      <AuthShell heading="Kata sandi baru" blurb="Buat kata sandi baru untuk akun Anda.">
        <ResetForm token={typeof searchParams.token === "string" ? searchParams.token : ""} />
      </AuthShell>
    </>
  );
}
