"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AuthPageWrapper from "@/components/auth-page-wrapper";

export default function ConfirmPage() {
  const supabase = createClient();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    setResent(false);

    // Récupère la session en cours pour avoir l'email
    const { data } = await supabase.auth.getSession();
    const email = data?.session?.user?.email;

    if (email) {
      await supabase.auth.resend({ email, type: "signup" });
    }

    setResending(false);
    setResent(true);

    // Reset le message après 4 secondes
    setTimeout(() => setResent(false), 4000);
  };

  return (
    <AuthPageWrapper>
      <div style={{ textAlign: "center" }}>
        {/* Icone enveloppe animée */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 28px",
            fontSize: 36,
          }}
        >
          ✉️
        </div>

        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px" }}>
          Vérifie ton email
        </h1>

        <p
          style={{
            margin: "14px 0 0",
            fontSize: 14,
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.7,
            maxWidth: 340,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Un email de confirmation a été envoyé. Clique sur le lien dans l&apos;email pour activer ton compte.
        </p>

        <p
          style={{
            margin: "12px 0 0",
            fontSize: 13,
            color: "rgba(255,255,255,0.22)",
            lineHeight: 1.5,
          }}
        >
          Si tu ne le vois pas, vérifie ton dossier spam.
        </p>

        {/* Séparateur */}
        <div
          style={{
            margin: "32px 0",
            height: 1,
            background: "rgba(255,255,255,0.07)",
            borderRadius: 1,
          }}
        />

        {/* Bouton renvoyer */}
        {resent ? (
          <div
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 10,
              padding: "12px 20px",
              color: "#4ade80",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            ✓ Email renvoyé avec succès
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10,
              padding: "11px 24px",
              color: resending ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.6)",
              fontSize: 14,
              fontWeight: 500,
              cursor: resending ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => { if (!resending) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "#fff"; } }}
            onMouseLeave={(e) => { if (!resending) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; } }}
          >
            {resending ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.2)",
                    borderTop: "2px solid rgba(255,255,255,0.6)",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
                Envoi...
              </span>
            ) : (
              "Renvoyer l'email"
            )}
          </button>
        )}

        {/* Retour login */}
        <div style={{ marginTop: 28 }}>
          <a
            href="/auth/login"
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: 13,
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
          >
            ← Retour à la connexion
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthPageWrapper>
  );
}