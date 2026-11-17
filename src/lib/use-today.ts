"use client";

import { useSyncExternalStore } from "react";
import { getTodayDateString } from "./date-utils";

const noopSubscribe = () => () => {};

/**
 * Data de hoje (YYYY-MM-DD, America/Sao_Paulo) lida apenas no navegador.
 *
 * Com Cache Components, ler `new Date()` durante a renderização congelaria a
 * data no momento do build. No servidor/pré-render retorna "" e, na hidratação,
 * passa a retornar a data real — sem divergência de HTML.
 */
export function useTodayDate(): string {
  return useSyncExternalStore(noopSubscribe, getTodayDateString, () => "");
}
