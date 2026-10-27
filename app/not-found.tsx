import Link from "next/link";
export default function NotFound() {
  return (
    <div className="inner-poster">
      <span className="micro">ERROR 404</span>
      <h1 className="display-heading italic">Esta página no existe.</h1>
      <Link href="/" className="button">
        Volver al inicio ↗
      </Link>
    </div>
  );
}
