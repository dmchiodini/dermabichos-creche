"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
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
      title="Painel do Administrador"
      subtitle="Gestão cadastral, histórico completo, indicadores e equipe"
      background="bg-linear-to-b from-slate-100 to-slate-200"
      submitLabel="Acessar Painel Administrativo"
      submitClassName="bg-ink hover:bg-slate-800"
      secretLabel="Senha do Administrador:"
      secretPlaceholder="••••••••"
      demoHint={
        demo ? (
          <>
            Modo demonstração: digite qualquer senha (ex: <strong>admin123</strong>) para entrar.
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
          return "Não foi possível conectar ao servidor. Tente novamente.";
        }
      }}
    >
      <div className="space-y-1">
        <label htmlFor="admin-email" className="text-xs font-bold text-ink">
          E-mail Administrativo:
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@dermabichos.com.br"
            className="w-full text-sm pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-blue"
          />
        </div>
      </div>
    </LoginCard>
  );
}
