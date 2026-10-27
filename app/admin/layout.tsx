import type { Metadata } from "next";
import "./admin.css";
export const metadata: Metadata = {
  title: "Panel de administrador",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};
export const dynamic = "force-dynamic";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
