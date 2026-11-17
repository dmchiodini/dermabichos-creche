import "server-only";
import { createAdminClient, PHOTO_BUCKET } from "@/lib/supabase/admin";
import type {
  Pet, Guardian, Attendance, DailyReport, DailyPhoto, StaffMember, ReportShare,
  DailyActivityLog, DailyActivityPhoto, ActivityTemplate,
} from "@/types/database.types";
import {
  initialMockPets, initialMockGuardians, initialMockPetGuardians,
  initialMockStaff, getInitialMockTodayAttendance, getInitialMockTodayReports,
  getInitialMockTodayActivityLogs, initialMockActivityTemplates,
} from "@/lib/mock-data";
import { getTodayDateString } from "@/lib/date-utils";
import { UserError } from "@/lib/action-result";

/**
 * Camada de acesso a dados — SOMENTE SERVIDOR, SEM CHECAGEM DE PERMISSÃO.
 * Nunca exporte estas funções diretamente para o cliente: use `db-service.ts`,
 * que valida a sessão antes de chamá-las.
 *
 * Comportamento preservado do protótipo: se o Supabase não estiver disponível
 * (ou retornar vazio), usa os dados de demonstração em memória. A diferença é que
 * agora essa memória vive no servidor e é compartilhada entre monitora, admin e portal.
 */

type PetGuardianLink = { pet_id: string; guardian_id: string; relationship?: string; is_primary: boolean };

const mem = {
  pets: [...initialMockPets],
  guardians: [...initialMockGuardians],
  petGuardians: [...initialMockPetGuardians] as PetGuardianLink[],
  staff: [...initialMockStaff],
  attendance: [...getInitialMockTodayAttendance()],
  reports: [...getInitialMockTodayReports()],
  activityLogs: [...getInitialMockTodayActivityLogs()] as DailyActivityLog[],
  activityTemplates: [...initialMockActivityTemplates] as ActivityTemplate[],
};

const db = () => createAdminClient();

function upsertInMemory<T>(list: T[], match: (item: T) => boolean, item: T): void {
  const idx = list.findIndex(match);
  if (idx >= 0) list[idx] = item;
  else list.push(item);
}

// -------------------------------------------------------------
// FOTOS: validação e upload para o Storage
// -------------------------------------------------------------
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const DATA_URL_RE = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/;

/** Aceita apenas imagens em data-URL ou URLs http(s). Bloqueia `javascript:` e afins. */
export function sanitizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (DATA_URL_RE.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Envia uma imagem em data-URL para o bucket de fotos e devolve o caminho e a URL pública.
 * Se o Storage não estiver disponível, mantém a data-URL (comportamento de demonstração).
 */
async function storePhoto(folder: string, url: string): Promise<{ file_path: string; storage_url: string }> {
  const clean = sanitizeImageUrl(url);
  if (!clean) throw new UserError("Formato de imagem inválido. Envie uma foto JPG, PNG ou WebP.");

  const match = clean.match(DATA_URL_RE);
  const fallbackPath = `${folder}/${Date.now()}.jpg`;
  if (!match) return { file_path: fallbackPath, storage_url: clean }; // já é uma URL http(s)

  const [, ext, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  if (bytes.byteLength > MAX_PHOTO_BYTES) {
    throw new UserError("Foto muito grande (máximo 6 MB).");
  }

  const supabase = db();
  if (supabase) {
    const filePath = `${folder}/${crypto.randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`;
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(filePath, bytes, { contentType: `image/${ext}`, cacheControl: "86400", upsert: false });
    if (!error) {
      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filePath);
      return { file_path: filePath, storage_url: data.publicUrl };
    }
    console.warn("Upload para o Storage falhou; mantendo a foto inline:", error.message);
  }
  return { file_path: fallbackPath, storage_url: clean };
}

async function removeStoredFiles(paths: (string | null | undefined)[]): Promise<void> {
  const supabase = db();
  const real = paths.filter((p): p is string => !!p && !p.startsWith("draft/"));
  if (!supabase || real.length === 0) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(real);
  if (error) console.warn("Falha ao remover fotos do Storage:", error.message);
}

// -------------------------------------------------------------
// PETS
// -------------------------------------------------------------
export async function getPets(): Promise<Pet[]> {
  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase.from("pets").select("*").order("name");
    if (!error && data && data.length > 0) return data as Pet[];
  }
  return mem.pets;
}

async function getPetById(id: string): Promise<Pet | null> {
  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase.from("pets").select("*").eq("id", id).maybeSingle();
    if (!error && data) return data as Pet;
  }
  return mem.pets.find((p) => p.id === id) ?? null;
}

/** Caminho no bucket de uma URL pública do nosso Storage (ou null se for link externo). */
function storagePathFromUrl(url: string | null | undefined): string | null {
  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
  const idx = url?.indexOf(marker) ?? -1;
  return url && idx >= 0 ? decodeURIComponent(url.slice(idx + marker.length).split("?")[0]) : null;
}

/**
 * Foto de perfil (pet ou equipe): imagem enviada do computador/celular sobe para o
 * Storage e só a URL é guardada; ao trocar ou remover, apaga a anterior (se era nossa).
 */
async function resolveProfilePhoto(
  folder: string,
  incoming: string | null | undefined,
  previous: string | null | undefined
): Promise<string | null> {
  let photoUrl = sanitizeImageUrl(incoming);
  if (photoUrl && DATA_URL_RE.test(photoUrl)) {
    photoUrl = (await storePhoto(folder, photoUrl)).storage_url;
  }
  const previousPath = storagePathFromUrl(previous);
  if (previousPath && previous !== photoUrl) await removeStoredFiles([previousPath]);
  return photoUrl;
}

export async function savePet(pet: Partial<Pet>): Promise<Pet> {
  const id = pet.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const previousPhoto = pet.id ? (await getPetById(pet.id))?.photo_url : null;
  const photoUrl = await resolveProfilePhoto(`pets/${id}`, pet.photo_url, previousPhoto);

  const payload: Pet = {
    id,
    name: pet.name?.trim() || "Sem Nome",
    photo_url: photoUrl,
    breed: pet.breed || "Não especificado",
    gender: pet.gender || "macho",
    birth_date: pet.birth_date || null,
    approximate_age: pet.approximate_age || "",
    size: pet.size || "medio",
    temperament: pet.temperament || "",
    diet_restrictions: pet.diet_restrictions || "",
    allergies: pet.allergies || "",
    care_notes: pet.care_notes || "",
    general_notes: pet.general_notes || "",
    status: pet.status || "active",
    created_at: pet.created_at || now,
    updated_at: now,
  };

  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase.from("pets").upsert(payload).select().single();
    if (!error && data) return data as Pet;
    console.error("Erro ao salvar pet no Supabase:", error?.message);
  }

  upsertInMemory(mem.pets, (p) => p.id === id, { ...mem.pets.find((p) => p.id === id), ...payload });
  return payload;
}

// -------------------------------------------------------------
// RESPONSÁVEIS (GUARDIANS)
// -------------------------------------------------------------
export async function getGuardians(): Promise<Guardian[]> {
  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase.from("guardians").select("*").order("full_name");
    if (!error && data && data.length > 0) return data as Guardian[];
  }
  return mem.guardians;
}

export async function saveGuardian(guardian: Partial<Guardian>): Promise<Guardian> {
  const id = guardian.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const payload: Guardian = {
    id,
    full_name: guardian.full_name?.trim() || "Sem Nome",
    phone: guardian.phone?.trim() || "",
    email: guardian.email?.trim() || "",
    notes: guardian.notes || "",
    created_at: guardian.created_at || now,
    updated_at: now,
  };

  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase.from("guardians").upsert(payload).select().single();
    if (!error && data) return data as Guardian;
    console.error("Erro ao salvar responsável no Supabase:", error?.message);
  }

  upsertInMemory(mem.guardians, (g) => g.id === id, { ...mem.guardians.find((g) => g.id === id), ...payload });
  return payload;
}

async function getPetGuardianLinks(): Promise<PetGuardianLink[]> {
  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase
      .from("pet_guardians")
      .select("pet_id, guardian_id, relationship, is_primary");
    if (!error && data && data.length > 0) return data as PetGuardianLink[];
  }
  return mem.petGuardians;
}

/**
 * Define o conjunto completo de responsáveis de um pet (feito no cadastro do pet):
 * remove os vínculos que saíram e cria os novos, preservando os que já existiam.
 * Um mesmo responsável pode estar vinculado a vários pets.
 */
export async function setPetGuardians(petId: string, guardianIds: string[]): Promise<void> {
  const wanted = Array.from(new Set(guardianIds));
  const supabase = db();
  if (supabase) {
    const { data: current, error: readError } = await supabase
      .from("pet_guardians")
      .select("guardian_id")
      .eq("pet_id", petId);
    if (readError) throw new Error(`Erro ao ler vínculos do pet: ${readError.message}`);

    const existing = new Set((current ?? []).map((row) => row.guardian_id as string));
    const toRemove = [...existing].filter((gid) => !wanted.includes(gid));
    const toAdd = wanted.filter((gid) => !existing.has(gid));

    if (toRemove.length > 0) {
      const { error } = await supabase.from("pet_guardians").delete().eq("pet_id", petId).in("guardian_id", toRemove);
      if (error) throw new Error(`Erro ao remover vínculo: ${error.message}`);
    }
    if (toAdd.length > 0) {
      const rows = toAdd.map((gid) => ({
        pet_id: petId,
        guardian_id: gid,
        relationship: "Responsável",
        is_primary: existing.size === 0 && gid === wanted[0],
      }));
      const { error } = await supabase.from("pet_guardians").insert(rows);
      if (error) throw new Error(`Erro ao vincular responsável: ${error.message}`);
    }
  }

  const kept = mem.petGuardians.filter((pg) => pg.pet_id !== petId || wanted.includes(pg.guardian_id));
  const keptIds = new Set(kept.filter((pg) => pg.pet_id === petId).map((pg) => pg.guardian_id));
  for (const gid of wanted) {
    if (!keptIds.has(gid)) kept.push({ pet_id: petId, guardian_id: gid, relationship: "Responsável", is_primary: keptIds.size === 0 });
  }
  mem.petGuardians = kept;
}

/** Mapa petId → responsáveis, com 2 consultas no total (antes: 1 por pet). */
export async function getGuardiansByPet(): Promise<Record<string, Guardian[]>> {
  const [guardians, links] = await Promise.all([getGuardians(), getPetGuardianLinks()]);
  const byId = new Map(guardians.map((g) => [g.id, g]));
  const map: Record<string, Guardian[]> = {};
  for (const link of links) {
    const guardian = byId.get(link.guardian_id);
    if (!guardian) continue;
    (map[link.pet_id] ||= []).push(guardian);
  }
  return map;
}

export async function getGuardiansForPet(petId: string): Promise<Guardian[]> {
  return (await getGuardiansByPet())[petId] || [];
}

/** Normaliza telefone brasileiro: só dígitos, sem o DDI 55. */
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return (digits.length === 12 || digits.length === 13) && digits.startsWith("55") ? digits.slice(2) : digits;
}

/** Localiza o responsável por telefone (correspondência exata) ou e-mail. */
export async function findGuardianByIdentifier(identifier: string): Promise<Guardian | null> {
  const raw = identifier.trim();
  if (!raw) return null;

  const guardians = await getGuardians();
  if (raw.includes("@")) {
    const email = raw.toLowerCase();
    return guardians.find((g) => g.email?.toLowerCase() === email) || null;
  }

  const phone = normalizePhone(raw);
  if (phone.length < 10) return null; // exige DDD + número completo
  return guardians.find((g) => normalizePhone(g.phone || "") === phone) || null;
}

export async function getGuardianById(id: string): Promise<Guardian | null> {
  return (await getGuardians()).find((g) => g.id === id) || null;
}

// -------------------------------------------------------------
// FUNCIONÁRIOS (STAFF)
// -------------------------------------------------------------
export async function getStaffMembers(): Promise<StaffMember[]> {
  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase.from("staff_members").select("*").order("name");
    if (!error && data && data.length > 0) return data as StaffMember[];
  }
  return mem.staff;
}

async function getStaffMemberById(id: string): Promise<StaffMember | null> {
  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase.from("staff_members").select("*").eq("id", id).maybeSingle();
    if (!error && data) return data as StaffMember;
  }
  return mem.staff.find((s) => s.id === id) ?? null;
}

export async function saveStaffMember(member: Partial<StaffMember>): Promise<StaffMember> {
  const id = member.id || crypto.randomUUID();
  const payload: StaffMember = {
    id,
    name: member.name?.trim() || "Novo Funcionário",
    role_title: member.role_title?.trim() || "Monitor de Creche",
    active: member.active !== undefined ? member.active : true,
    created_at: member.created_at || new Date().toISOString(),
  };

  // A foto só entra no payload quando foi informada (ou removida): assim, bancos
  // ainda sem a coluna photo_url continuam salvando nome/cargo/status normalmente.
  if (member.photo_url !== undefined) {
    const previous = member.id ? (await getStaffMemberById(member.id))?.photo_url : null;
    payload.photo_url = await resolveProfilePhoto(`staff/${id}`, member.photo_url, previous);
  }

  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase.from("staff_members").upsert(payload).select().single();
    if (!error && data) return data as StaffMember;
    if (error && /photo_url/.test(error.message)) {
      throw new UserError(
        "O banco ainda não tem o campo de foto da equipe. Rode a migração supabase/migrations/20261117_staff_photo.sql no Supabase."
      );
    }
    console.error("Erro ao salvar funcionário no Supabase:", error?.message);
  }

  const merged = { ...mem.staff.find((s) => s.id === id), ...payload };
  upsertInMemory(mem.staff, (s) => s.id === id, merged);
  return merged;
}

// -------------------------------------------------------------
// PRESENÇA (ATTENDANCE)
// -------------------------------------------------------------
export async function getAttendanceByDate(date: string): Promise<Attendance[]> {
  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase.from("attendance").select("*").eq("date", date);
    if (!error && data && data.length > 0) return data as Attendance[];
  }
  return mem.attendance.filter((a) => a.date === date);
}

export async function updateAttendance(petId: string, date: string, updates: Partial<Attendance>): Promise<Attendance> {
  const supabase = db();

  // Busca o registro existente no banco (antes só olhava a memória, o que gerava
  // conflito com a restrição UNIQUE(pet_id, date) ao gravar no Supabase).
  let existing: Attendance | undefined;
  if (supabase) {
    const { data } = await supabase.from("attendance").select("*").eq("pet_id", petId).eq("date", date).maybeSingle();
    existing = (data as Attendance | null) || undefined;
  }
  existing ||= mem.attendance.find((a) => a.pet_id === petId && a.date === date);

  const payload: Attendance = {
    id: existing?.id || crypto.randomUUID(),
    pet_id: petId,
    date,
    status: updates.status || existing?.status || "expected",
    check_in_time: updates.check_in_time !== undefined ? updates.check_in_time : existing?.check_in_time || null,
    check_out_time: updates.check_out_time !== undefined ? updates.check_out_time : existing?.check_out_time || null,
    registered_by: updates.registered_by || existing?.registered_by || null,
    created_at: existing?.created_at || new Date().toISOString(),
  };

  if (supabase) {
    const { data, error } = await supabase
      .from("attendance")
      .upsert(payload, { onConflict: "pet_id,date" })
      .select()
      .single();
    if (!error && data) return data as Attendance;
    console.error("Erro ao salvar presença no Supabase:", error?.message);
  }

  upsertInMemory(mem.attendance, (a) => a.pet_id === petId && a.date === date, payload);
  return payload;
}

// -------------------------------------------------------------
// RELATÓRIOS DIÁRIOS (DAILY REPORTS)
// -------------------------------------------------------------
const REPORT_SELECT = "*, photos:daily_photos(*), incidents(*)";

export async function getDailyReport(petId: string, date: string): Promise<DailyReport | null> {
  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase
      .from("daily_reports")
      .select(REPORT_SELECT)
      .eq("pet_id", petId)
      .eq("date", date)
      .maybeSingle();
    if (!error && data) return data as DailyReport;
  }
  return mem.reports.find((r) => r.pet_id === petId && r.date === date) || null;
}

/** Todos os relatórios de uma data em UMA consulta (antes: 1 consulta por pet). */
export async function getDailyReportsByDate(date: string): Promise<DailyReport[]> {
  const fromMemory = mem.reports.filter((r) => r.date === date);
  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase.from("daily_reports").select(REPORT_SELECT).eq("date", date);
    if (!error && data) {
      const fromDb = data as DailyReport[];
      const covered = new Set(fromDb.map((r) => r.pet_id));
      return [...fromDb, ...fromMemory.filter((r) => !covered.has(r.pet_id))];
    }
  }
  return fromMemory;
}

export async function saveDailyReport(
  report: Partial<DailyReport> & { pet_id: string; date: string }
): Promise<DailyReport> {
  const existing = await getDailyReport(report.pet_id, report.date);
  const now = new Date().toISOString();

  const pick = <K extends keyof DailyReport>(key: K, fallback: DailyReport[K]): DailyReport[K] =>
    (report[key] !== undefined ? report[key] : existing?.[key] ?? fallback) as DailyReport[K];

  const payload: DailyReport = {
    id: existing?.id || report.id || crypto.randomUUID(),
    pet_id: report.pet_id,
    date: report.date,
    status: report.status || existing?.status || "in_progress",
    feeding: report.feeding || existing?.feeding || "nao_observado",
    feeding_notes: pick("feeding_notes", ""),
    water: report.water || existing?.water || "nao_observado",
    water_notes: pick("water_notes", ""),
    activities_participation: report.activities_participation || existing?.activities_participation || "nao_observado",
    activities_notes: pick("activities_notes", ""),
    nap_after_lunch: report.nap_after_lunch || existing?.nap_after_lunch || "nao_observado",
    nap_notes: pick("nap_notes", ""),
    behavior_socialization: pick("behavior_socialization", ""),
    free_observations: pick("free_observations", ""),
    created_at: existing?.created_at || now,
    updated_at: now,
    photos: existing?.photos || report.photos || [],
  };

  const supabase = db();
  if (supabase) {
    const { photos: _photos, ...row } = payload;
    void _photos;
    const { data, error } = await supabase
      .from("daily_reports")
      .upsert(row, { onConflict: "pet_id,date" })
      .select()
      .single();
    if (!error && data) return { ...payload, ...data };
    console.error("Erro ao salvar relatório no Supabase:", error?.message);
  }

  upsertInMemory(mem.reports, (r) => r.pet_id === report.pet_id && r.date === report.date, payload);
  return payload;
}

// -------------------------------------------------------------
// FOTOS DIÁRIAS DO RELATÓRIO (MAX 5, EXPIRAÇÃO 7 DIAS)
// -------------------------------------------------------------
export async function addDailyPhoto(reportId: string, petId: string, photoUrl: string, caption?: string): Promise<DailyPhoto> {
  const report = mem.reports.find((r) => r.id === reportId);
  const currentPhotos = report?.photos || [];
  if (currentPhotos.length >= 5) throw new UserError("Limite máximo de 5 fotos por relatório diário atingido.");

  const stored = await storePhoto(`reports/${reportId}`, photoUrl);
  const photo: DailyPhoto = {
    id: crypto.randomUUID(),
    report_id: reportId,
    pet_id: petId,
    ...stored,
    caption: caption || null,
    created_at: new Date().toISOString(),
  };

  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase.from("daily_photos").insert(photo).select().single();
    if (!error && data) return data as DailyPhoto;
    if (error?.message.includes("Limite")) throw new UserError(error.message);
  }

  if (report) report.photos = [...currentPhotos, photo];
  return photo;
}

export async function removeDailyPhoto(photoId: string, reportId: string): Promise<void> {
  const supabase = db();
  if (supabase) {
    const { data } = await supabase.from("daily_photos").delete().eq("id", photoId).select("file_path");
    await removeStoredFiles((data || []).map((p) => p.file_path as string));
  }
  const report = mem.reports.find((r) => r.id === reportId);
  if (report?.photos) report.photos = report.photos.filter((p) => p.id !== photoId);
}

// -------------------------------------------------------------
// AUDITORIA & COMPARTILHAMENTO WHATSAPP
// -------------------------------------------------------------
export async function recordReportShare(share: Omit<ReportShare, "id" | "created_at">): Promise<void> {
  const supabase = db();
  if (!supabase) return;
  const { error } = await supabase.from("report_shares").insert(share);
  if (error) console.warn("Falha ao registrar compartilhamento:", error.message);
}

// -------------------------------------------------------------
// REGISTROS DO DIA (ATIVIDADES COLETIVAS & FOTOS - ATÉ 10 FOTOS POR ATIVIDADE)
// -------------------------------------------------------------
const MAX_ACTIVITY_PHOTOS = 10;

export async function getDailyActivityLogs(date: string): Promise<DailyActivityLog[]> {
  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase
      .from("daily_activity_logs")
      .select("*, photos:daily_activity_photos(*)")
      .eq("date", date)
      .order("created_at", { ascending: true });
    if (!error && data && data.length > 0) {
      return (data as DailyActivityLog[]).map((log) => ({
        ...log,
        photos: [...(log.photos || [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      }));
    }
  }
  return mem.activityLogs
    .filter((l) => l.date === date)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function getActivityLogById(id: string): Promise<DailyActivityLog | null> {
  const supabase = db();
  if (supabase) {
    const { data } = await supabase
      .from("daily_activity_logs")
      .select("*, photos:daily_activity_photos(*)")
      .eq("id", id)
      .maybeSingle();
    if (data) return data as DailyActivityLog;
  }
  return mem.activityLogs.find((l) => l.id === id) || null;
}

export async function saveDailyActivityLog(
  log: Partial<DailyActivityLog> & { date: string; title: string; description: string }
): Promise<DailyActivityLog> {
  const existing = log.id ? await getActivityLogById(log.id) : null;
  const id = existing?.id || log.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const incomingPhotos = log.photos || existing?.photos || [];
  const draftPhotos = incomingPhotos.filter((p) => p.activity_log_id === "draft" || p.activity_log_id !== id);
  const persistedPhotos = incomingPhotos.filter((p) => !draftPhotos.includes(p));

  const payload: DailyActivityLog = {
    id,
    date: log.date,
    title: log.title.trim(),
    description: log.description.trim(),
    created_by: log.created_by || existing?.created_by || null,
    created_by_name: log.created_by_name || existing?.created_by_name || "Monitora",
    created_at: existing?.created_at || now,
    updated_at: now,
    photos: persistedPhotos,
  };

  const supabase = db();
  let savedInDb = false;
  if (supabase) {
    const { photos: _photos, ...row } = payload;
    void _photos;
    const { data, error } = await supabase.from("daily_activity_logs").upsert(row).select().single();
    if (!error && data) {
      Object.assign(payload, data, { photos: persistedPhotos });
      savedInDb = true;
    } else {
      console.error("Erro ao salvar registro do dia no Supabase:", error?.message);
    }
  }

  if (!savedInDb) {
    upsertInMemory(mem.activityLogs, (l) => l.id === id, payload);
  }

  // Fotos anexadas antes do registro existir: agora são persistidas de verdade
  // (antes eram descartadas silenciosamente quando o Supabase estava ativo).
  for (const draft of draftPhotos.slice(0, Math.max(0, MAX_ACTIVITY_PHOTOS - persistedPhotos.length))) {
    const url = draft.storage_url || draft.file_path;
    if (!url) continue;
    const photo = await addDailyActivityPhoto(id, url, draft.caption || undefined);
    if (!payload.photos.some((p) => p.id === photo.id)) payload.photos.push(photo);
  }

  return payload;
}

export async function deleteDailyActivityLog(id: string): Promise<void> {
  const supabase = db();
  if (supabase) {
    const { data: photos } = await supabase.from("daily_activity_photos").select("file_path").eq("activity_log_id", id);
    const { error } = await supabase.from("daily_activity_logs").delete().eq("id", id);
    if (!error) await removeStoredFiles((photos || []).map((p) => p.file_path as string));
  }
  mem.activityLogs = mem.activityLogs.filter((l) => l.id !== id);
}

export async function addDailyActivityPhoto(
  activityLogId: string,
  photoUrl: string,
  caption?: string
): Promise<DailyActivityPhoto> {
  const memLog = mem.activityLogs.find((l) => l.id === activityLogId);
  const currentPhotos = memLog?.photos || [];
  if (currentPhotos.length >= MAX_ACTIVITY_PHOTOS) {
    throw new UserError("Limite máximo de 10 fotos por atividade atingido.");
  }

  const stored = await storePhoto(`activities/${activityLogId}`, photoUrl);
  const photo: DailyActivityPhoto = {
    id: crypto.randomUUID(),
    activity_log_id: activityLogId,
    ...stored,
    caption: caption || null,
    created_at: new Date().toISOString(),
  };

  const supabase = db();
  if (supabase && !memLog) {
    const { data, error } = await supabase.from("daily_activity_photos").insert(photo).select().single();
    if (!error && data) return data as DailyActivityPhoto;
    if (error?.message.includes("Limite")) {
      await removeStoredFiles([stored.file_path]);
      throw new UserError(error.message);
    }
    console.error("Erro ao salvar foto da atividade no Supabase:", error?.message);
  }

  if (memLog) memLog.photos = [...currentPhotos, photo];
  return photo;
}

export async function removeDailyActivityPhoto(photoId: string, activityLogId: string): Promise<void> {
  const supabase = db();
  if (supabase) {
    const { data } = await supabase.from("daily_activity_photos").delete().eq("id", photoId).select("file_path");
    await removeStoredFiles((data || []).map((p) => p.file_path as string));
  }
  const log = mem.activityLogs.find((l) => l.id === activityLogId);
  if (log?.photos) log.photos = log.photos.filter((p) => p.id !== photoId);
}

// -------------------------------------------------------------
// PORTAL DO RESPONSÁVEL (RESTRIÇÃO ESTRITA: APENAS HOJE NO FUSO BRASÍLIA)
// -------------------------------------------------------------
export async function getGuardianPortalData(guardianId: string) {
  const today = getTodayDateString();
  const guardian = await getGuardianById(guardianId);
  if (!guardian) return { guardian: null, pets: [], reports: [], activityLogs: [], date: today };

  const [links, allPets, attendance, reports, activityLogs] = await Promise.all([
    getPetGuardianLinks(),
    getPets(),
    getAttendanceByDate(today),
    getDailyReportsByDate(today),
    getDailyActivityLogs(today),
  ]);

  const linkedPetIds = new Set(links.filter((l) => l.guardian_id === guardian.id).map((l) => l.pet_id));
  const linkedPets = allPets.filter((p) => linkedPetIds.has(p.id));

  const todayReports: DailyReport[] = linkedPets.map((pet) => {
    const rep = reports.find((r) => r.pet_id === pet.id);
    const att = attendance.find((a) => a.pet_id === pet.id);
    if (rep) return { ...rep, pet, attendance: att };
    // Estado vazio inicial do dia para visualização
    return {
      id: `empty-${pet.id}`,
      pet_id: pet.id,
      date: today,
      status: "draft",
      feeding: "nao_observado",
      water: "nao_observado",
      activities_participation: "nao_observado",
      nap_after_lunch: "nao_observado",
      pet,
      attendance: att,
      created_at: new Date().toISOString(),
    };
  });

  return { guardian, pets: linkedPets, reports: todayReports, activityLogs, date: today };
}

// -------------------------------------------------------------
// MODELOS DE ATIVIDADES (GERENCIADAS PELO ADMINISTRADOR)
// -------------------------------------------------------------
export async function getActivityTemplates(onlyActive = false): Promise<ActivityTemplate[]> {
  const supabase = db();
  if (supabase) {
    let query = supabase.from("activity_templates").select("*").order("title");
    if (onlyActive) query = query.eq("active", true);
    const { data, error } = await query;
    if (!error && data && data.length > 0) return data as ActivityTemplate[];
  }
  return onlyActive ? mem.activityTemplates.filter((t) => t.active) : mem.activityTemplates;
}

export async function saveActivityTemplate(template: Partial<ActivityTemplate>): Promise<ActivityTemplate> {
  const id = template.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const payload: ActivityTemplate = {
    id,
    title: template.title?.trim() || "Nova Atividade",
    default_description: template.default_description?.trim() || "",
    category: template.category?.trim() || "Recreação",
    active: template.active !== undefined ? template.active : true,
    created_at: template.created_at || now,
    updated_at: now,
  };

  const supabase = db();
  if (supabase) {
    const { data, error } = await supabase.from("activity_templates").upsert(payload).select().single();
    if (!error && data) return data as ActivityTemplate;
    console.error("Erro ao salvar modelo de atividade no Supabase:", error?.message);
  }

  upsertInMemory(mem.activityTemplates, (t) => t.id === id, payload);
  return payload;
}

export async function deleteActivityTemplate(id: string): Promise<void> {
  const supabase = db();
  if (supabase) {
    const { error } = await supabase.from("activity_templates").delete().eq("id", id);
    if (error) console.error("Erro ao excluir modelo de atividade:", error.message);
  }
  mem.activityTemplates = mem.activityTemplates.filter((t) => t.id !== id);
}
