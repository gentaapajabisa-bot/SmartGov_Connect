import Link from "next/link";
import { ROLE_LABEL, type SessionUser } from "@/lib/types";
import LogoutButton from "./LogoutButton";

export default function Header({ user }: { user?: SessionUser | null }) {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">S</span>
          SmartGov Connect
        </Link>
        {user ? (
          <div className="header-user">
            <span>{user.name}</span>
            <span className="role-chip">{ROLE_LABEL[user.role]}</span>
            <LogoutButton />
          </div>
        ) : (
          <nav className="header-user">
            <Link href="/login" className="btn btn-ghost btn-sm">Masuk</Link>
            <Link href="/register" className="btn btn-light btn-sm">Daftar</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
