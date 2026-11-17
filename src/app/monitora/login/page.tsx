"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginCard, safeNextPath } from "@/components/auth/LoginCard";
import { getLoginMode, loginStaff } from "@/services/auth-actions";

export default function MonitoraLoginPage() {
  const router = useRouter();
  const [monitorName, setMonitorName] = useState("Ana Paula");
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    getLoginMode().then((m) => setDemo(m.staffDemo)).catch(() => setDemo(false));
  }, []);

  return (
    <LoginCard
      title="Acesso da Monitora"
      subtitle="Espaço operacional exclusivo para registros da rotina diária da creche"
      background="bg-linear-to-b from-brand-blue-light to-brand-pink-light"
      submitLabel="Iniciar Plantão na Creche"
      submitClassName="bg-brand-blue-ink hover:bg-ink"
      secretLabel="PIN ou Senha de Acesso:"
      secretPlaceholder="Digite seu PIN"
      secretInputMode="numeric"
      demoHint={
        demo ? (
          <>
            Modo demonstração: digite qualquer PIN (ex: <strong>1234</strong>) para entrar.
          </>
        ) : null
      }
      onSubmit={async (pin) => {
        try {
          const result = await loginStaff(monitorName, pin);
          if (!result.ok) return result.error;
          router.replace(safeNextPath("/monitora", "/monitora"));
          router.refresh();
          return null;
        } catch {
          return "Não foi possível conectar ao servidor. Tente novamente.";
        }
      }}
    >
      <div className="space-y-1">
        <label htmlFor="monitor-name" className="text-xs font-bold text-ink">
          Selecione a Monitora:
        </label>
        <select
          id="monitor-name"
          value={monitorName}
          onChange={(e) => setMonitorName(e.target.value)}
          className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-blue"
        >
          <option value="Ana Paula">Ana Paula (Monitora de Creche)</option>
          <option value="Mariana Cuidadores">Mariana (Monitora Assistente)</option>
        </select>
      </div>
    </LoginCard>
  );
}
