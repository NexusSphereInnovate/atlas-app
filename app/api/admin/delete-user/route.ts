import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data: caller } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!caller || !["admin_global", "admin_org"].includes(caller.role))
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId manquant" }, { status: 400 });

    const admin = createAdminClient();

    // Supprimer l'utilisateur auth (cascade sur user_profiles si FK configurée)
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("[delete-user] auth error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Tenter de supprimer le profil (peut échouer si FK avec factures — on ignore)
    await admin.from("user_profiles").delete().eq("id", userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[delete-user] unexpected:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
