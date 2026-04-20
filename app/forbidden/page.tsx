import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <div className="text-lg font-semibold">403</div>
        <div className="mt-1 text-sm text-white/55">Accès refusé.</div>
        <div className="mt-6 flex gap-3">
          <Link className="rounded-2xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15" href="/auth/login">
            Login
          </Link>
          <Link className="rounded-2xl bg-white px-4 py-2 text-sm text-black hover:bg-white/90" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}