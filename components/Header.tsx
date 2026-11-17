import Link from "next/link";
import { ROLE_LABEL, type SessionUser } from "@/lib/types";
import Logo from "./Logo";
import LogoutButton from "./LogoutButton";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

export default function Header({ user }: { user?: SessionUser | null }) {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">
          <Logo size={36} />
          SmartGov Connect
        </Link>
        {user ? (
          <div className="header-user">
            <ThemeToggle />
            <NotificationBell />
            <span>{user.name}</span>
            <span className="role-chip">{ROLE_LABEL[user.role]}</span>
            <LogoutButton />
          </div>
        ) : (
          <nav className="header-user">
            <ThemeToggle />
            <Link href="/login" className="btn btn-ghost btn-sm">Masuk</Link>
            <Link href="/register" className="btn btn-light btn-sm">Daftar</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
