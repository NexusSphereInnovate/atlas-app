import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data: callerProfile } = await supabase
      .from("user_profiles")
      .select("role, org_id")
      .eq("id", user.id)
      .single();

    if (!callerProfile || !["admin_global", "admin_org"].includes(callerProfile.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. Parse body
    const { email, password, firstName, lastName, role, phone } = await req.json();

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 3. Créer l'utilisateur auth
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (createError) {
      console.error("[create-user] Supabase error:", JSON.stringify(createError));

      // Si le trigger handle_new_user crashe (DB error), on essaie de le contourner
      if (createError.message?.toLowerCase().includes("database error")) {
        return NextResponse.json(
          {
            error:
              "Erreur déclencheur base de données. Exécutez la migration 010 dans Supabase SQL Editor : supabase/migrations/010_fix_trigger_minimal.sql",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (!newUser?.user) {
      return NextResponse.json({ error: "Utilisateur non créé" }, { status: 400 });
    }

    // 4. Upsert le profil avec le bon rôle (le trigger l'a déjà inséré, on corrige)
    const { error: profileError } = await admin
      .from("user_profiles")
      .upsert(
        {
          id: newUser.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          role,
          phone: phone || null,
          is_active: true,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("[create-user] profile upsert error:", JSON.stringify(profileError));
    }

    return NextResponse.json({ success: true, userId: newUser.user.id });
  } catch (err) {
    console.error("[create-user] unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
