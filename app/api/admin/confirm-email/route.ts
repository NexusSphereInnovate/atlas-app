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
    const { error } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (error) {
      console.error("[confirm-email] error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[confirm-email] unexpected:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
