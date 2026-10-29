"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RotinaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/monitora");
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-slate-500">
      Redirecionando para a área operacional da monitora...
    </div>
  );
}
