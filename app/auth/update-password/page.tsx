"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthPageWrapper from "@/components/auth-page-wrapper";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null); // null = on vérifie

  // Vérifie qu'il y a bien une session active (via le token du lien email)
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data?.session);
    };
    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passwordsMatch = password === confirmPassword;
  const passwordValid = password.length >= 8;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordValid) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (!passwordsMatch) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    // Redirect vers login après 2 secondes
    setTimeout(() => router.push("/auth/login"), 2000);
  };

  // ── Loading initial (vérifie session) ───────────────────
  if (hasSession === null) {
    return (
      <AuthPageWrapper>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <span
            style={{
              display: "inline-block",
              width: 24,
              height: 24,
              border: "2px solid rgba(255,255,255,0.15)",
              borderTop: "2px solid #3b82f6",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AuthPageWrapper>
    );
  }

  // ── Pas de session = lien invalide ou expiré ─────────────
  if (!hasSession) {
    return (
      <AuthPageWrapper>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: 30,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px" }}>
            Lien invalide
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
            Ce lien est expiré ou n&apos;est plus valide. Demande un nouveau lien de réinitialisation.
          </p>
          <a
            href="/auth/forgot-password"
            style={{
              display: "inline-block",
              marginTop: 28,
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "11px 24px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2563eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#3b82f6")}
          >
            Nouveau lien
          </a>
        </div>
      </AuthPageWrapper>
    );
  }

  // ── Succès ───────────────────────────────────────────────
  if (success) {
    return (
      <AuthPageWrapper>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: 30,
            }}
          >
            ✅
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px" }}>
            Mot de passe mis à jour
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
            Vous serez redirigé vers la page de connexion dans quelques instants...
          </p>
        </div>
      </AuthPageWrapper>
    );
  }

  // ── Formulaire principal ─────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "13px 16px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 6,
    letterSpacing: "0.3px",
  };

  return (
    <AuthPageWrapper>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px" }}>
          Nouveau mot de passe
        </h1>
        <p style={{ margin: "10px 0 0", fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
          Choisissez un nouveau mot de passe pour votre compte.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Nouveau mot de passe */}
        <div>
          <label style={labelStyle}>Nouveau mot de passe</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder="Au moins 8 caractères"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = "#3b82f6";
              e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.12)";
              e.target.style.boxShadow = "none";
            }}
          />
          {/* Barre de force */}
          {password.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
              {[1, 2, 3, 4].map((level) => {
                const strength =
                  password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)
                    ? 4
                    : password.length >= 10 && (/[A-Z]/.test(password) || /[0-9]/.test(password))
                    ? 3
                    : password.length >= 8
                    ? 2
                    : 1;
                let color = "rgba(255,255,255,0.1)";
                if (level <= strength) {
                  color = strength >= 3 ? "#22c55e" : strength === 2 ? "#eab308" : "#ef4444";
                }
                return (
                  <div
                    key={level}
                    style={{ flex: 1, height: 3, borderRadius: 2, background: color, transition: "background 0.3s" }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation mot de passe */}
        <div>
          <label style={labelStyle}>Confirmer le mot de passe</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder="Répétez votre mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              ...inputStyle,
              borderColor:
                confirmPassword.length > 0 && !passwordsMatch ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3b82f6";
              e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor =
                confirmPassword.length > 0 && !passwordsMatch ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)";
              e.target.style.boxShadow = "none";
            }}
          />
          {/* Indicateur match */}
          {confirmPassword.length > 0 && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: passwordsMatch ? "#4ade80" : "#f87171",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>{passwordsMatch ? "✓" : "✕"}</span>
              {passwordsMatch ? "Les mots de passe correspondent" : "Les mots de passe ne correspondent pas"}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#f87171",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !passwordsMatch || !passwordValid}
          style={{
            width: "100%",
            background: loading || !passwordsMatch || !passwordValid ? "rgba(59,130,246,0.35)" : "#fff",
            color: loading || !passwordsMatch || !passwordValid ? "rgba(255,255,255,0.5)" : "#0f1117",
            border: "none",
            borderRadius: 10,
            padding: "13px 0",
            fontSize: 15,
            fontWeight: 600,
            cursor: loading || !passwordsMatch || !passwordValid ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "background 0.2s, transform 0.1s",
            marginTop: 2,
          }}
          onMouseEnter={(e) => {
            if (!loading && passwordsMatch && passwordValid) e.currentTarget.style.background = "#f0f0f0";
          }}
          onMouseLeave={(e) => {
            if (!loading && passwordsMatch && passwordValid) e.currentTarget.style.background = "#fff";
          }}
          onMouseDown={(e) => {
            if (!loading && passwordsMatch && passwordValid) e.currentTarget.style.transform = "scale(0.985)";
          }}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {loading ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid #fff",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              />
              Mise à jour...
            </span>
          ) : (
            "Mettre à jour le mot de passe"
          )}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </form>
    </AuthPageWrapper>
  );
}