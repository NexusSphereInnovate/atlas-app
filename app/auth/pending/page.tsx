import Image from "next/image";
import Link from "next/link";
import { Clock, Mail } from "lucide-react";
import { signOut } from "@/lib/auth/helpers";

export default function PendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1117] px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
            <Image src="/logo.svg" alt="Atlas" width={22} height={22} />
          </div>
        </div>

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
          <Clock className="h-7 w-7 text-amber-400" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">Compte en attente</h1>
        <p className="mt-3 text-sm text-white/40 leading-relaxed max-w-xs mx-auto">
          Votre compte est en cours d&apos;activation. Votre administrateur ou agent vous contactera prochainement.
        </p>

        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-white/50">
            <Mail className="h-4 w-4 text-white/30" />
            <span>Vous recevrez un email dès l&apos;activation</span>
          </div>
        </div>

        <div className="mt-8">
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-white/30 transition-colors hover:text-white/60"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
