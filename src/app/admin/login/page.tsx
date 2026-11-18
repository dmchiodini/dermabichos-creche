"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginCard, safeNextPath } from "@/components/auth/LoginCard";
import { getLoginMode, loginAdmin } from "@/services/auth-actions";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@dermabichos.com.br");
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    getLoginMode().then((m) => setDemo(m.adminDemo)).catch(() => setDemo(false));
  }, []);

  return (
    <LoginCard
      area="Administração"
      title="Entrar no painel"
      subtitle="Cadastros, equipe, indicadores e histórico da creche."
      submitLabel="Entrar"
      secretLabel="Senha"
      secretPlaceholder="••••••••"
      demoHint={
        demo ? (
          <>
            Modo demonstração: qualquer senha funciona (ex.: <strong>admin123</strong>).
          </>
        ) : null
      }
      onSubmit={async (password) => {
        try {
          const result = await loginAdmin(email, password);
          if (!result.ok) return result.error;
          router.replace(safeNextPath("/admin/", "/admin/dashboard"));
          router.refresh();
          return null;
        } catch {
          return "Não foi possível conectar ao servidor. Verifique a internet e tente novamente.";
        }
      }}
    >
      <div>
        <label htmlFor="admin-email" className="field-label">
          E-mail
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@dermabichos.com.br"
          className="field"
        />
      </div>
    </LoginCard>
  );
}
