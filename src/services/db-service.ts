"use server";

/**
 * Fronteira de segurança da aplicação.
 *
 * Cada função exportada aqui é uma Server Action: pode ser chamada pelos Client
 * Components como uma função assíncrona comum, mas executa no servidor. Por isso
 * TODAS validam a sessão/papel e a entrada antes de acessar `data-store.ts`.
 *
 * Papéis:
 *  - admin    → gestão completa, qualquer data
 *  - staff    → operação da creche, ESTRITAMENTE o dia de hoje (America/Sao_Paulo)
 *  - guardian → portal, apenas os próprios pets e o dia de hoje
 */

import { z } from "zod";
import * as store from "./data-store";
import { requireRole, AuthError } from "@/lib/auth/session";
import { UserError, type ActionResult } from "@/lib/action-result";
import { getTodayDateString } from "@/lib/date-utils";
import type {
  Pet, Guardian, Attendance, DailyReport, DailyPhoto, StaffMember, ReportShare,
  DailyActivityLog, DailyActivityPhoto, ActivityTemplate, PortalData,
} from "@/types/database.types";

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof UserError) return { ok: false, error: err.message, code: err.code };
    console.error("[db-service] erro inesperado:", err);
    return { ok: false, error: "Erro inesperado no servidor. Tente novamente.", code: "ERROR" };
  }
}

// -------------------------------------------------------------
// Validação
// -------------------------------------------------------------
const id = z.string().trim().min(1).max(80);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const shortText = z.string().max(200);
const longText = z.string().max(4000);
const isoOrNull = z.string().max(40).nullable();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new UserError("Dados inválidos: " + result.error.issues.map((i) => i.message).join("; "));
  }
  return result.data;
}

/** Monitora só pode ler/escrever a data de hoje; admin pode qualquer data. */
async function requireDateAccess(targetDate: string) {
  const session = await requireRole("admin", "staff");
  if (session.role === "staff" && targetDate !== getTodayDateString()) {
    throw new AuthError("A área da monitora é restrita aos registros do dia de hoje.");
  }
  return session;
}

const petSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(1, "Nome do pet é obrigatório").max(80),
  // Link https ou foto enviada pelo admin (data-URL, já comprimida no navegador).
  photo_url: z.string().max(8_500_000).nullable().optional(),
  breed: shortText.optional(),
  gender: z.enum(["macho", "femea"]).optional(),
  birth_date: z.string().max(20).nullable().optional(),
  approximate_age: z.string().max(60).nullable().optional(),
  size: z.enum(["pequeno", "medio", "grande"]).optional(),
  temperament: longText.optional(),
  diet_restrictions: longText.optional(),
  allergies: longText.optional(),
  care_notes: longText.optional(),
  general_notes: longText.optional(),
  status: z.enum(["active", "inactive"]).optional(),
  created_at: z.string().max(40).optional(),
});

const guardianSchema = z.object({
  id: id.optional(),
  full_name: z.string().trim().min(1, "Nome do responsável é obrigatório").max(120),
  phone: z.string().max(30).optional(),
  email: z.union([z.literal(""), z.email("E-mail inválido").max(160)]).optional(),
  notes: longText.optional(),
  created_at: z.string().max(40).optional(),
});

const staffSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(1, "Nome do colaborador é obrigatório").max(120),
  role_title: shortText.optional(),
  // Link https ou foto enviada pelo admin (data-URL, já comprimida no navegador).
  photo_url: z.string().max(8_500_000).nullable().optional(),
  active: z.boolean().optional(),
  created_at: z.string().max(40).optional(),
});

const attendanceUpdateSchema = z.object({
  status: z.enum(["present", "absent", "expected"]).optional(),
  check_in_time: isoOrNull.optional(),
  check_out_time: isoOrNull.optional(),
});

const reportSchema = z.object({
  id: id.optional(),
  pet_id: id,
  date,
  status: z.enum(["draft", "in_progress", "completed", "shared"]).optional(),
  feeding: z.enum(["comeu_tudo", "parcial", "nao_comeu", "nao_observado"]).optional(),
  feeding_notes: longText.nullable().optional(),
  water: z.enum(["normal", "pouco", "muito", "nao_observado"]).optional(),
  water_notes: longText.nullable().optional(),
  activities_participation: z.enum(["participou", "parcial", "nao_participou", "nao_observado"]).optional(),
  activities_notes: longText.nullable().optional(),
  nap_after_lunch: z.enum(["sim", "nao", "nao_observado"]).optional(),
  nap_notes: longText.nullable().optional(),
  behavior_socialization: longText.nullable().optional(),
  free_observations: longText.nullable().optional(),
});

const photoUrl = z.string().min(1).max(9_000_000);

const activityPhotoSchema = z.object({
  id: id,
  activity_log_id: z.string().max(80),
  file_path: z.string().max(500),
  storage_url: z.string().max(9_000_000).nullable().optional(),
  caption: z.string().max(300).nullable().optional(),
  created_at: z.string().max(40),
});

const activityLogSchema = z.object({
  id: id.optional(),
  date,
  title: z.string().trim().min(1, "Informe o título da atividade").max(150),
  description: z.string().trim().min(1, "Descreva a atividade").max(4000),
  created_by_name: z.string().max(120).nullable().optional(),
  photos: z.array(activityPhotoSchema).max(10, "Limite máximo de 10 fotos por atividade atingido.").optional(),
});

const templateSchema = z.object({
  id: id.optional(),
  title: z.string().trim().min(1, "Informe o título da atividade").max(150),
  default_description: longText.optional(),
  category: z.string().max(80).optional(),
  active: z.boolean().optional(),
  created_at: z.string().max(40).optional(),
});

// -------------------------------------------------------------
// PETS
// -------------------------------------------------------------
export async function getPets(): Promise<ActionResult<Pet[]>> {
  return run(async () => {
    await requireRole("admin", "staff");
    return store.getPets();
  });
}

export async function savePet(pet: Partial<Pet>): Promise<ActionResult<Pet>> {
  return run(async () => {
    await requireRole("admin");
    return store.savePet(parse(petSchema, pet));
  });
}

// -------------------------------------------------------------
// RESPONSÁVEIS (dados pessoais: somente equipe)
// -------------------------------------------------------------
export async function getGuardians(): Promise<ActionResult<Guardian[]>> {
  return run(async () => {
    await requireRole("admin");
    return store.getGuardians();
  });
}

export async function saveGuardian(guardian: Partial<Guardian>): Promise<ActionResult<Guardian>> {
  return run(async () => {
    await requireRole("admin");
    return store.saveGuardian(parse(guardianSchema, guardian));
  });
}

/** Vínculos pet ↔ responsáveis são gerenciados no cadastro do pet (lista completa). */
export async function setPetGuardians(petId: string, guardianIds: string[]): Promise<ActionResult<void>> {
  return run(async () => {
    await requireRole("admin");
    return store.setPetGuardians(parse(id, petId), parse(z.array(id).max(20, "Máximo de 20 responsáveis por pet."), guardianIds));
  });
}

export async function getGuardiansForPet(petId: string): Promise<ActionResult<Guardian[]>> {
  return run(async () => {
    await requireRole("admin", "staff");
    return store.getGuardiansForPet(parse(id, petId));
  });
}

/** Mapa petId → responsáveis em uma única chamada (evita N+1). */
export async function getGuardiansByPet(): Promise<ActionResult<Record<string, Guardian[]>>> {
  return run(async () => {
    await requireRole("admin", "staff");
    return store.getGuardiansByPet();
  });
}

// -------------------------------------------------------------
// FUNCIONÁRIOS
// -------------------------------------------------------------
export async function getStaffMembers(): Promise<ActionResult<StaffMember[]>> {
  return run(async () => {
    await requireRole("admin");
    return store.getStaffMembers();
  });
}

export async function saveStaffMember(member: Partial<StaffMember>): Promise<ActionResult<StaffMember>> {
  return run(async () => {
    await requireRole("admin");
    return store.saveStaffMember(parse(staffSchema, member));
  });
}

// -------------------------------------------------------------
// PRESENÇA
// -------------------------------------------------------------
export async function getAttendanceByDate(targetDate: string): Promise<ActionResult<Attendance[]>> {
  return run(async () => {
    await requireDateAccess(parse(date, targetDate));
    return store.getAttendanceByDate(targetDate);
  });
}

export async function updateAttendance(petId: string, targetDate: string, updates: Partial<Attendance>): Promise<ActionResult<Attendance>> {
  return run(async () => {
    await requireDateAccess(parse(date, targetDate));
    return store.updateAttendance(parse(id, petId), targetDate, parse(attendanceUpdateSchema, updates));
  });
}

// -------------------------------------------------------------
// RELATÓRIOS DIÁRIOS
// -------------------------------------------------------------
export async function getDailyReport(petId: string, targetDate: string): Promise<ActionResult<DailyReport | null>> {
  return run(async () => {
    await requireDateAccess(parse(date, targetDate));
    return store.getDailyReport(parse(id, petId), targetDate);
  });
}

/** Todos os relatórios de uma data em uma única chamada (evita N+1). */
export async function getDailyReportsByDate(targetDate: string): Promise<ActionResult<DailyReport[]>> {
  return run(async () => {
    await requireDateAccess(parse(date, targetDate));
    return store.getDailyReportsByDate(targetDate);
  });
}

export async function saveDailyReport(
  report: Partial<DailyReport> & { pet_id: string; date: string }
): Promise<ActionResult<DailyReport>> {
  return run(async () => {
    const data = parse(reportSchema, report);
    await requireDateAccess(data.date);
    return store.saveDailyReport(data);
  });
}

export async function addDailyPhoto(reportId: string, petId: string, url: string, caption?: string): Promise<ActionResult<DailyPhoto>> {
  return run(async () => {
    await requireRole("admin", "staff");
    return store.addDailyPhoto(parse(id, reportId), parse(id, petId), parse(photoUrl, url), caption?.slice(0, 300));
  });
}

export async function removeDailyPhoto(photoId: string, reportId: string): Promise<ActionResult<void>> {
  return run(async () => {
    await requireRole("admin", "staff");
    return store.removeDailyPhoto(parse(id, photoId), parse(id, reportId));
  });
}

export async function recordReportShare(share: Omit<ReportShare, "id" | "created_at">): Promise<ActionResult<void>> {
  return run(async () => {
    await requireRole("admin", "staff");
    const data = parse(
      z.object({
        report_id: id,
        guardian_id: id,
        channel: z.literal("whatsapp"),
        status: z.enum(["initiated", "completed"]),
        recipient_phone: z.string().max(30),
      }),
      share
    );
    return store.recordReportShare(data);
  });
}

// -------------------------------------------------------------
// REGISTROS DO DIA (ATIVIDADES COLETIVAS & FOTOS)
// -------------------------------------------------------------
/** Garante que a monitora só mexa em registros de hoje (admin: qualquer um). */
async function requireActivityLogAccess(logId: string): Promise<void> {
  const session = await requireRole("admin", "staff");
  if (session.role === "admin") return;
  const log = await store.getActivityLogById(logId);
  if (log && log.date !== getTodayDateString()) {
    throw new AuthError("A área da monitora é restrita aos registros do dia de hoje.");
  }
}

export async function getDailyActivityLogs(targetDate: string): Promise<ActionResult<DailyActivityLog[]>> {
  return run(async () => {
    await requireDateAccess(parse(date, targetDate));
    return store.getDailyActivityLogs(targetDate);
  });
}

export async function saveDailyActivityLog(
  log: Partial<DailyActivityLog> & { date: string; title: string; description: string }
): Promise<ActionResult<DailyActivityLog>> {
  return run(async () => {
    const data = parse(activityLogSchema, log);
    const session = await requireDateAccess(data.date);
    if (data.id) await requireActivityLogAccess(data.id);
    return store.saveDailyActivityLog({
      ...data,
      // O nome do autor vem da sessão, não do navegador.
      created_by_name: session.name || data.created_by_name || undefined,
      photos: data.photos as DailyActivityPhoto[] | undefined,
    });
  });
}

export async function deleteDailyActivityLog(logId: string): Promise<ActionResult<void>> {
  return run(async () => {
    await requireActivityLogAccess(parse(id, logId));
    return store.deleteDailyActivityLog(logId);
  });
}

export async function addDailyActivityPhoto(activityLogId: string, url: string, caption?: string): Promise<ActionResult<DailyActivityPhoto>> {
  return run(async () => {
    await requireActivityLogAccess(parse(id, activityLogId));
    return store.addDailyActivityPhoto(activityLogId, parse(photoUrl, url), caption?.slice(0, 300));
  });
}

export async function removeDailyActivityPhoto(photoId: string, activityLogId: string): Promise<ActionResult<void>> {
  return run(async () => {
    await requireActivityLogAccess(parse(id, activityLogId));
    return store.removeDailyActivityPhoto(parse(id, photoId), activityLogId);
  });
}

// -------------------------------------------------------------
// CARGA DAS TELAS (uma action por tela)
//
// O Next.js executa Server Actions UMA POR VEZ por cliente: um Promise.all de
// várias actions no navegador vira uma fila (N idas e voltas ao servidor).
// Estas actions fazem as consultas em paralelo NO SERVIDOR e respondem de uma vez.
// -------------------------------------------------------------
export interface DayOverviewData {
  pets: Pet[];
  attendance: Attendance[];
  reports: DailyReport[];
}

/** Dashboard do admin: pets + presença + diários do dia. */
export async function getDashboardData(targetDate: string): Promise<ActionResult<DayOverviewData>> {
  return run(async () => {
    await requireRole("admin");
    const day = parse(date, targetDate);
    const [pets, attendance, reports] = await Promise.all([
      store.getPets(),
      store.getAttendanceByDate(day),
      store.getDailyReportsByDate(day),
    ]);
    return { pets, attendance, reports };
  });
}

export interface HistoryData extends DayOverviewData {
  activityLogs: DailyActivityLog[];
}

/** Histórico geral do admin: tudo do dia escolhido. */
export async function getHistoryData(targetDate: string): Promise<ActionResult<HistoryData>> {
  return run(async () => {
    await requireRole("admin");
    const day = parse(date, targetDate);
    const [pets, attendance, reports, activityLogs] = await Promise.all([
      store.getPets(),
      store.getAttendanceByDate(day),
      store.getDailyReportsByDate(day),
      store.getDailyActivityLogs(day),
    ]);
    return { pets, attendance, reports, activityLogs };
  });
}

export interface RegistryData {
  pets: Pet[];
  guardians: Guardian[];
  guardiansByPet: Record<string, Guardian[]>;
}

/** Cadastros (telas de Pets e de Responsáveis): pets, responsáveis e vínculos. */
export async function getRegistryData(): Promise<ActionResult<RegistryData>> {
  return run(async () => {
    await requireRole("admin");
    const [pets, guardians, guardiansByPet] = await Promise.all([
      store.getPets(),
      store.getGuardians(),
      store.getGuardiansByPet(),
    ]);
    return { pets, guardians, guardiansByPet };
  });
}

export interface MonitoraData extends DayOverviewData {
  /** Nome de quem está usando a tela (vem da sessão). */
  viewerName: string;
  guardiansByPet: Record<string, Guardian[]>;
  activityLogs: DailyActivityLog[];
  templates: ActivityTemplate[];
}

/** Área da monitora: tudo do dia (staff só acessa hoje; admin, qualquer data). */
export async function getMonitoraData(targetDate: string): Promise<ActionResult<MonitoraData>> {
  return run(async () => {
    const session = await requireDateAccess(parse(date, targetDate));
    const [pets, attendance, reports, guardiansByPet, activityLogs, templates] = await Promise.all([
      store.getPets(),
      store.getAttendanceByDate(targetDate),
      store.getDailyReportsByDate(targetDate),
      store.getGuardiansByPet(),
      store.getDailyActivityLogs(targetDate),
      // A monitora só enxerga os modelos ativos (mesma regra de getActivityTemplates).
      store.getActivityTemplates(true),
    ]);
    return { viewerName: session.name, pets, attendance, reports, guardiansByPet, activityLogs, templates };
  });
}

// -------------------------------------------------------------
// PORTAL DO RESPONSÁVEL — identidade vem da sessão, nunca do navegador
// -------------------------------------------------------------
/** Remove do pet as notas internas da equipe antes de enviar ao portal. */
function toPublicPet(pet: Pet): Pet {
  const { id: petId, name, photo_url, breed, gender, approximate_age, status, created_at } = pet;
  return { id: petId, name, photo_url, breed, gender, approximate_age, status, created_at };
}

export async function getGuardianPortalPetsAndTodayReports(): Promise<ActionResult<PortalData>> {
  return run(async () => {
    const session = await requireRole("guardian");
    if (!session.guardianId) throw new AuthError();
    const data = await store.getGuardianPortalData(session.guardianId);
    if (!data.guardian) throw new AuthError();

    return {
      // Apenas o necessário do próprio cadastro.
      guardian: { id: data.guardian.id, full_name: data.guardian.full_name },
      pets: data.pets.map(toPublicPet),
      reports: data.reports.map(({ incidents, pet, ...report }) => ({
        ...report,
        pet: pet ? toPublicPet(pet) : undefined,
        // Só ocorrências marcadas para notificar o responsável.
        incidents: incidents?.filter((i) => i.notify_guardian),
      })),
      activityLogs: data.activityLogs,
      date: data.date,
    };
  });
}

// -------------------------------------------------------------
// MODELOS DE ATIVIDADES
// -------------------------------------------------------------
export async function getActivityTemplates(onlyActive = false): Promise<ActionResult<ActivityTemplate[]>> {
  return run(async () => {
    const session = await requireRole("admin", "staff");
    // A monitora só enxerga os modelos ativos.
    return store.getActivityTemplates(session.role === "staff" ? true : onlyActive);
  });
}

export async function saveActivityTemplate(template: Partial<ActivityTemplate>): Promise<ActionResult<ActivityTemplate>> {
  return run(async () => {
    await requireRole("admin");
    return store.saveActivityTemplate(parse(templateSchema, template));
  });
}

export async function deleteActivityTemplate(templateId: string): Promise<ActionResult<void>> {
  return run(async () => {
    await requireRole("admin");
    return store.deleteActivityTemplate(parse(id, templateId));
  });
}
