import AuthShell from "@/components/AuthShell";
import ForgotForm from "@/components/ForgotForm";
import Header from "@/components/Header";

export const metadata = { title: "Lupa Kata Sandi - SmartGov Connect" };

export default function ForgotPage() {
  return (
    <>
      <Header />
      <AuthShell heading="Lupa kata sandi" blurb="Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru.">
        <ForgotForm />
      </AuthShell>
    </>
  );
}
