export type UserRole = 'admin' | 'staff' | 'guardian';

export type PetSize = 'pequeno' | 'medio' | 'grande';
export type PetStatus = 'active' | 'inactive';
export type AttendanceStatus = 'present' | 'absent' | 'expected';

export type FeedingStatus = 'comeu_tudo' | 'parcial' | 'nao_comeu' | 'nao_observado';
export type WaterStatus = 'normal' | 'pouco' | 'muito' | 'nao_observado';
export type ActivityParticipation = 'participou' | 'parcial' | 'nao_participou' | 'nao_observado';
export type NapStatus = 'sim' | 'nao' | 'nao_observado';
export type ReportStatus = 'draft' | 'in_progress' | 'completed' | 'shared';

export interface Profile {
  id: string; // references auth.users.id
  role: UserRole;
  full_name: string;
  phone?: string;
  email?: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Guardian {
  id: string;
  user_id?: string | null;
  full_name: string;
  phone: string;
  email?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Pet {
  id: string;
  name: string;
  photo_url?: string | null;
  breed?: string;
  gender?: 'macho' | 'femea';
  birth_date?: string | null;
  approximate_age?: string | null;
  size: PetSize;
  temperament?: string;
  diet_restrictions?: string;
  allergies?: string;
  care_notes?: string;
  general_notes?: string;
  status: PetStatus;
  created_at: string;
  updated_at?: string;
  // joined fields
  guardians?: Guardian[];
}

export interface PetGuardian {
  id: string;
  pet_id: string;
  guardian_id: string;
  relationship?: string;
  is_primary: boolean;
  created_at: string;
}

export interface StaffMember {
  id: string;
  user_id?: string | null;
  name: string;
  role_title: string;
  active: boolean;
  created_at: string;
}

export interface Attendance {
  id: string;
  pet_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  check_in_time?: string | null;
  check_out_time?: string | null;
  registered_by?: string | null;
  created_at: string;
}

export interface DailyReport {
  id: string;
  pet_id: string;
  date: string; // YYYY-MM-DD
  status: ReportStatus;
  feeding: FeedingStatus;
  feeding_notes?: string | null;
  water: WaterStatus;
  water_notes?: string | null;
  activities_participation: ActivityParticipation;
  activities_notes?: string | null;
  nap_after_lunch: NapStatus;
  nap_notes?: string | null;
  behavior_socialization?: string | null;
  free_observations?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at?: string;
  // relations
  photos?: DailyPhoto[];
  incidents?: Incident[];
  pet?: Pet;
  attendance?: Attendance;
}

export interface DailyPhoto {
  id: string;
  report_id: string;
  pet_id: string;
  file_path: string;
  storage_url?: string | null;
  caption?: string | null;
  created_by?: string | null;
  created_at: string;
  is_expired?: boolean;
}

export interface Incident {
  id: string;
  report_id?: string | null;
  pet_id: string;
  date: string;
  description: string;
  action_taken?: string | null;
  notify_guardian: boolean;
  severity: 'baixa' | 'media' | 'alta';
  resolved: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface ReportShare {
  id: string;
  report_id: string;
  guardian_id: string;
  channel: 'whatsapp';
  status: 'initiated' | 'completed';
  recipient_phone: string;
  created_by?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}
