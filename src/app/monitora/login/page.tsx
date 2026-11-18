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
      area="Monitora"
      title="Começar o plantão"
      subtitle="Registre a chegada dos baixinhos, a rotina e as fotos de hoje."
      submitLabel="Entrar"
      secretLabel="PIN"
      secretPlaceholder="Digite seu PIN"
      secretInputMode="numeric"
      demoHint={
        demo ? (
          <>
            Modo demonstração: qualquer PIN funciona (ex.: <strong>1234</strong>).
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
          return "Não foi possível conectar ao servidor. Verifique a internet e tente novamente.";
        }
      }}
    >
      <div>
        <label htmlFor="monitor-name" className="field-label">
          Quem está entrando
        </label>
        <select id="monitor-name" value={monitorName} onChange={(e) => setMonitorName(e.target.value)} className="field">
          <option value="Ana Paula">Ana Paula (Monitora de Creche)</option>
          <option value="Mariana Cuidadores">Mariana (Monitora Assistente)</option>
        </select>
      </div>
    </LoginCard>
  );
}
