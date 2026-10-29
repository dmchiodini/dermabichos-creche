/**
 * Utilitários de data e hora para fuso horário de Brasília (America/Sao_Paulo)
 */

export function getTodayDateString(): string {
  // Retorna YYYY-MM-DD no fuso de São Paulo
  const now = new Date();
  const spDateStr = now.toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  }); // formato YYYY-MM-DD
  return spDateStr;
}

export function formatDateBR(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
}

export function formatTimeBR(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function formatDateTimeBR(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    return date.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

