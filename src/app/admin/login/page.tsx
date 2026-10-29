"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@dermabichos.com.br");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!password) {
      setError("Informe a senha de administrador.");
      setLoading(false);
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("dermabichos_admin_session", JSON.stringify({
        email,
        role: "admin",
        loginAt: new Date().toISOString(),
      }));
    }

    router.push("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-[#25313B] text-white flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-9 h-9 text-[#79B7DE]" />
          </div>
          <h1 className="text-2xl font-black text-[#25313B]">Painel do Administrador</h1>
          <p className="text-xs text-[#5B6570]">
            Gestão cadastral, histórico completo, indicadores e equipe
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#25313B]">E-mail Administrativo:</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dermabichos.com.br"
                className="w-full text-sm pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#79B7DE]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#25313B]">Senha do Administrador:</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#25313B] hover:bg-slate-800 shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Acessar Painel Administrativo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Dica rápida para teste: digite qualquer senha (ex: <strong>admin123</strong>) para entrar.
          </p>
        </div>
      </div>
    </div>
  );
}
