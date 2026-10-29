"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Dog, Shield, UserCheck, KeyRound, ArrowRight } from "lucide-react";

export default function MonitoraLoginPage() {
  const router = useRouter();
  const [monitorName, setMonitorName] = useState("Ana Paula");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validação simples e rápida para a operação
    if (!pin) {
      setError("Informe a senha ou PIN de acesso.");
      setLoading(false);
      return;
    }

    // Grava sessão da monitora no localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("dermabichos_staff_session", JSON.stringify({
        name: monitorName,
        role: "staff",
        loginAt: new Date().toISOString(),
      }));
    }

    router.push("/monitora");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f7fc] to-[#fbf2f6] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-[#79B7DE] text-white flex items-center justify-center mx-auto shadow-md">
            <UserCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-[#25313B]">Acesso da Monitora</h1>
          <p className="text-xs text-[#5B6570]">
            Espaço operacional exclusivo para registros da rotina diária da creche
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#25313B]">Selecione a Monitora:</label>
            <select
              value={monitorName}
              onChange={(e) => setMonitorName(e.target.value)}
              className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#79B7DE]"
            >
              <option value="Ana Paula">Ana Paula (Monitora de Creche)</option>
              <option value="Mariana Cuidadores">Mariana (Monitora Assistente)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#25313B]">PIN ou Senha de Acesso:</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Digite seu PIN (Ex: 1234)"
                className="w-full text-sm pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#79B7DE]"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#79B7DE] hover:bg-[#5ea4d0] shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Iniciar Plantão na Creche</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Dica rápida para teste: digite qualquer PIN (ex: <strong>1234</strong>) para entrar.
          </p>
        </div>
      </div>
    </div>
  );
}

