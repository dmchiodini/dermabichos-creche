import { createClient } from "@/lib/supabase/client";
import { 
  Pet, Guardian, Attendance, DailyReport, DailyPhoto, StaffMember, Incident, ReportShare 
} from "@/types/database.types";
import { 
  initialMockPets, initialMockGuardians, initialMockPetGuardians, 
  initialMockStaff, getInitialMockTodayAttendance, getInitialMockTodayReports 
} from "@/lib/mock-data";
import { getTodayDateString } from "@/lib/date-utils";

// Armazenamento em memória / sessionStorage fallback para simulação e ambiente de desenvolvimento
let inMemoryPets = [...initialMockPets];
let inMemoryGuardians = [...initialMockGuardians];
let inMemoryPetGuardians = [...initialMockPetGuardians];
let inMemoryStaff = [...initialMockStaff];
let inMemoryAttendance = [...getInitialMockTodayAttendance()];
let inMemoryReports = [...getInitialMockTodayReports()];
let inMemoryIncidents: Incident[] = [];

// Helper para verificar se o Supabase está respondendo à tabela
async function isSupabaseAvailable(tableName: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from(tableName).select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// PETS
// -------------------------------------------------------------
export async function getPets(): Promise<Pet[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("pets").select("*").order("name");
    if (!error && data && data.length > 0) {
      return data as Pet[];
    }
  } catch {
    // fallback
  }
  return inMemoryPets;
}

export async function getPetById(id: string): Promise<Pet | null> {
  const pets = await getPets();
  return pets.find(p => p.id === id) || null;
}

export async function savePet(pet: Partial<Pet>): Promise<Pet> {
  const supabase = createClient();
  const id = pet.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const petPayload: Pet = {
    id,
    name: pet.name || "Sem Nome",
    photo_url: pet.photo_url || null,
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

  try {
    const { data, error } = await supabase.from("pets").upsert(petPayload).select().single();
    if (!error && data) {
      return data as Pet;
    }
  } catch {
    // fallback
  }

  // Fallback in-memory
  const index = inMemoryPets.findIndex(p => p.id === id);
  if (index >= 0) {
    inMemoryPets[index] = { ...inMemoryPets[index], ...petPayload };
  } else {
    inMemoryPets.push(petPayload);
  }
  return petPayload;
}

// -------------------------------------------------------------
// RESPONSÁVEIS (GUARDIANS)
// -------------------------------------------------------------
export async function getGuardians(): Promise<Guardian[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("guardians").select("*").order("full_name");
    if (!error && data && data.length > 0) {
      return data as Guardian[];
    }
  } catch {
    // fallback
  }
  return inMemoryGuardians;
}

export async function saveGuardian(guardian: Partial<Guardian>): Promise<Guardian> {
  const supabase = createClient();
  const id = guardian.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const payload: Guardian = {
    id,
    full_name: guardian.full_name || "Sem Nome",
    phone: guardian.phone || "",
    email: guardian.email || "",
    notes: guardian.notes || "",
    created_at: guardian.created_at || now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase.from("guardians").upsert(payload).select().single();
    if (!error && data) {
      return data as Guardian;
    }
  } catch {
    // fallback
  }

  const idx = inMemoryGuardians.findIndex(g => g.id === id);
  if (idx >= 0) {
    inMemoryGuardians[idx] = { ...inMemoryGuardians[idx], ...payload };
  } else {
    inMemoryGuardians.push(payload);
  }
  return payload;
}

export async function linkGuardianToPet(petId: string, guardianId: string, relationship = "Tutor"): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from("pet_guardians").upsert({
      pet_id: petId,
      guardian_id: guardianId,
      relationship,
      is_primary: true
    });
  } catch {
    // fallback
  }
  const exists = inMemoryPetGuardians.some(pg => pg.pet_id === petId && pg.guardian_id === guardianId);
  if (!exists) {
    inMemoryPetGuardians.push({ pet_id: petId, guardian_id: guardianId, relationship, is_primary: true });
  }
}

export async function getGuardiansForPet(petId: string): Promise<Guardian[]> {
  const allGuardians = await getGuardians();
  const links = inMemoryPetGuardians.filter(pg => pg.pet_id === petId);
  const guardianIds = new Set(links.map(l => l.guardian_id));
  return allGuardians.filter(g => guardianIds.has(g.id));
}

// -------------------------------------------------------------
// FUNCIONÁRIOS (STAFF)
// -------------------------------------------------------------
export async function getStaffMembers(): Promise<StaffMember[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("staff_members").select("*").order("name");
    if (!error && data && data.length > 0) {
      return data as StaffMember[];
    }
  } catch {
    // fallback
  }
  return inMemoryStaff;
}

export async function saveStaffMember(member: Partial<StaffMember>): Promise<StaffMember> {
  const supabase = createClient();
  const id = member.id || crypto.randomUUID();
  const payload: StaffMember = {
    id,
    name: member.name || "Novo Funcionário",
    role_title: member.role_title || "Monitor de Creche",
    active: member.active !== undefined ? member.active : true,
    created_at: member.created_at || new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from("staff_members").upsert(payload).select().single();
    if (!error && data) return data as StaffMember;
  } catch {
    // fallback
  }

  const idx = inMemoryStaff.findIndex(s => s.id === id);
  if (idx >= 0) {
    inMemoryStaff[idx] = { ...inMemoryStaff[idx], ...payload };
  } else {
    inMemoryStaff.push(payload);
  }
  return payload;
}

// -------------------------------------------------------------
// PRESENÇA (ATTENDANCE)
// -------------------------------------------------------------
export async function getAttendanceByDate(date: string): Promise<Attendance[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("attendance").select("*").eq("date", date);
    if (!error && data && data.length > 0) {
      return data as Attendance[];
    }
  } catch {
    // fallback
  }
  return inMemoryAttendance.filter(a => a.date === date);
}

export async function updateAttendance(petId: string, date: string, updates: Partial<Attendance>): Promise<Attendance> {
  const supabase = createClient();
  const existing = inMemoryAttendance.find(a => a.pet_id === petId && a.date === date);
  const id = existing?.id || crypto.randomUUID();

  const payload: Attendance = {
    id,
    pet_id: petId,
    date,
    status: updates.status || existing?.status || "expected",
    check_in_time: updates.check_in_time !== undefined ? updates.check_in_time : existing?.check_in_time || null,
    check_out_time: updates.check_out_time !== undefined ? updates.check_out_time : existing?.check_out_time || null,
    registered_by: updates.registered_by || existing?.registered_by || null,
    created_at: existing?.created_at || new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from("attendance").upsert(payload).select().single();
    if (!error && data) return data as Attendance;
  } catch {
    // fallback
  }

  const idx = inMemoryAttendance.findIndex(a => a.pet_id === petId && a.date === date);
  if (idx >= 0) {
    inMemoryAttendance[idx] = payload;
  } else {
    inMemoryAttendance.push(payload);
  }
  return payload;
}

// -------------------------------------------------------------
// RELATÓRIOS DIÁRIOS (DAILY REPORTS)
// -------------------------------------------------------------
export async function getDailyReport(petId: string, date: string): Promise<DailyReport | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("daily_reports")
      .select("*, photos:daily_photos(*), incidents(*)")
      .eq("pet_id", petId)
      .eq("date", date)
      .maybeSingle();

    if (!error && data) {
      return data as DailyReport;
    }
  } catch {
    // fallback
  }

  const found = inMemoryReports.find(r => r.pet_id === petId && r.date === date);
  return found || null;
}

export async function saveDailyReport(report: Partial<DailyReport> & { pet_id: string; date: string }): Promise<DailyReport> {
  const supabase = createClient();
  const existing = inMemoryReports.find(r => r.pet_id === report.pet_id && r.date === report.date);
  const id = existing?.id || report.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const payload: DailyReport = {
    id,
    pet_id: report.pet_id,
    date: report.date,
    status: report.status || existing?.status || "in_progress",
    feeding: report.feeding || existing?.feeding || "nao_observado",
    feeding_notes: report.feeding_notes !== undefined ? report.feeding_notes : existing?.feeding_notes || "",
    water: report.water || existing?.water || "nao_observado",
    water_notes: report.water_notes !== undefined ? report.water_notes : existing?.water_notes || "",
    activities_participation: report.activities_participation || existing?.activities_participation || "nao_observado",
    activities_notes: report.activities_notes !== undefined ? report.activities_notes : existing?.activities_notes || "",
    nap_after_lunch: report.nap_after_lunch || existing?.nap_after_lunch || "nao_observado",
    nap_notes: report.nap_notes !== undefined ? report.nap_notes : existing?.nap_notes || "",
    behavior_socialization: report.behavior_socialization !== undefined ? report.behavior_socialization : existing?.behavior_socialization || "",
    free_observations: report.free_observations !== undefined ? report.free_observations : existing?.free_observations || "",
    created_at: existing?.created_at || now,
    updated_at: now,
    photos: report.photos || existing?.photos || [],
  };

  try {
    const { data, error } = await supabase.from("daily_reports").upsert({
      id: payload.id,
      pet_id: payload.pet_id,
      date: payload.date,
      status: payload.status,
      feeding: payload.feeding,
      feeding_notes: payload.feeding_notes,
      water: payload.water,
      water_notes: payload.water_notes,
      activities_participation: payload.activities_participation,
      activities_notes: payload.activities_notes,
      nap_after_lunch: payload.nap_after_lunch,
      nap_notes: payload.nap_notes,
      behavior_socialization: payload.behavior_socialization,
      free_observations: payload.free_observations,
      updated_at: payload.updated_at
    }).select().single();

    if (!error && data) {
      return { ...payload, ...data };
    }
  } catch {
    // fallback
  }

  const idx = inMemoryReports.findIndex(r => r.pet_id === report.pet_id && r.date === report.date);
  if (idx >= 0) {
    inMemoryReports[idx] = payload;
  } else {
    inMemoryReports.push(payload);
  }
  return payload;
}

// -------------------------------------------------------------
// FOTOS DIÁRIAS (MAX 5, EXPIRAÇÃO 7 DIAS)
// -------------------------------------------------------------
export async function addDailyPhoto(reportId: string, petId: string, photoUrl: string, caption?: string): Promise<DailyPhoto> {
  const currentReport = inMemoryReports.find(r => r.id === reportId);
  const currentPhotos = currentReport?.photos || [];

  if (currentPhotos.length >= 5) {
    throw new Error("Limite máximo de 5 fotos por relatório diário atingido.");
  }

  const photo: DailyPhoto = {
    id: crypto.randomUUID(),
    report_id: reportId,
    pet_id: petId,
    file_path: `reports/${reportId}/${Date.now()}.jpg`,
    storage_url: photoUrl,
    caption: caption || null,
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("daily_photos").insert(photo).select().single();
    if (!error && data) {
      return data as DailyPhoto;
    }
  } catch {
    // fallback
  }

  if (currentReport) {
    currentReport.photos = [...currentPhotos, photo];
  }
  return photo;
}

export async function removeDailyPhoto(photoId: string, reportId: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from("daily_photos").delete().eq("id", photoId);
  } catch {
    // fallback
  }

  const rep = inMemoryReports.find(r => r.id === reportId);
  if (rep && rep.photos) {
    rep.photos = rep.photos.filter(p => p.id !== photoId);
  }
}

// -------------------------------------------------------------
// AUDITORIA & COMPARTILHAMENTO WHATSAPP
// -------------------------------------------------------------
export async function recordReportShare(share: Omit<ReportShare, "id" | "created_at">): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from("report_shares").insert(share);
  } catch {
    // fallback
  }
}

// -------------------------------------------------------------
// PORTAL DO RESPONSÁVEL (RESTRIÇÃO ESTRITA: APENAS HOJE NO FUSO BRASÍLIA)
// -------------------------------------------------------------
export async function getGuardianPortalPetsAndTodayReports(guardianIdentifier: string) {
  const today = getTodayDateString();
  const allGuardians = await getGuardians();
  
  // Localiza o responsável por telefone normalizado ou email
  const cleanId = guardianIdentifier.replace(/\D/g, "");
  const guardian = allGuardians.find(g => 
    (cleanId && g.phone.replace(/\D/g, "").includes(cleanId)) || 
    (g.email && g.email.toLowerCase() === guardianIdentifier.toLowerCase())
  ) || allGuardians[0]; // Se demo, usa o primeiro

  if (!guardian) return { guardian: null, pets: [], reports: [] };

  const linkedPetIds = inMemoryPetGuardians
    .filter(pg => pg.guardian_id === guardian.id)
    .map(pg => pg.pet_id);

  const allPets = await getPets();
  const linkedPets = allPets.filter(p => linkedPetIds.includes(p.id));

  // Busca estritamente relatórios do DIA ATUAL
  const todayReports: DailyReport[] = [];
  const todayAttendanceList: Attendance[] = await getAttendanceByDate(today);

  for (const pet of linkedPets) {
    const rep = await getDailyReport(pet.id, today);
    const att = todayAttendanceList.find(a => a.pet_id === pet.id);
    if (rep) {
      todayReports.push({ ...rep, pet, attendance: att });
    } else {
      // Cria estado vazio inicial do dia para visualização
      todayReports.push({
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
      });
    }
  }

  return {
    guardian,
    pets: linkedPets,
    reports: todayReports,
    date: today,
  };
}

