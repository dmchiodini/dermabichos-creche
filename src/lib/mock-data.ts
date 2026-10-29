import { Pet, Guardian, DailyReport, Attendance, StaffMember, Incident, DailyPhoto } from "@/types/database.types";
import { getTodayDateString } from "./date-utils";

export const initialMockPets: Pet[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Thor",
    photo_url: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80",
    breed: "Golden Retriever",
    gender: "macho",
    approximate_age: "3 anos",
    size: "grande",
    temperament: "Muito dócil, brincalhão e enérgico. Adora piscina e bolinha.",
    diet_restrictions: "Ração hipoalergênica ao meio-dia (150g).",
    allergies: "Frango",
    care_notes: "Gosta de carinho na orelha e descansar na sombra após brincadeiras.",
    general_notes: "Convive muito bem com todos os portes.",
    status: "active",
    created_at: "2026-10-29T08:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Pipoca",
    photo_url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80",
    breed: "Spitz Alemão",
    gender: "femea",
    approximate_age: "1 ano e meio",
    size: "pequeno",
    temperament: "Atenta, alegre, adora correr com cães do mesmo porte.",
    diet_restrictions: "Não pode petiscos com corante.",
    care_notes: "Cuidado com pulos altos e escadas.",
    general_notes: "Muito apegada aos monitores.",
    status: "active",
    created_at: "2026-10-29T08:00:00Z",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Mel",
    photo_url: "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=400&q=80",
    breed: "Labrador Retriever",
    gender: "femea",
    approximate_age: "4 anos",
    size: "grande",
    temperament: "Amorosa, tranquila, sociável e carinhosa.",
    diet_restrictions: "Ração padrão fornecida pela tutora às 12h.",
    care_notes: "Toma água em pausas controladas após corrida.",
    status: "active",
    created_at: "2026-10-29T08:00:00Z",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Bob",
    photo_url: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=400&q=80",
    breed: "Bulldog Francês",
    gender: "macho",
    approximate_age: "2 anos",
    size: "medio",
    temperament: "Calmo, carismático, adora soneca após o almoço.",
    diet_restrictions: "Ração especial para braquicefálicos.",
    care_notes: "Evitar esforço intenso em horários quentes. Manter na sala climatizada.",
    status: "active",
    created_at: "2026-10-29T08:00:00Z",
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    name: "Luna",
    photo_url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80",
    breed: "Vira-lata (SRD)",
    gender: "femea",
    approximate_age: "2 anos",
    size: "medio",
    temperament: "Brincalhona, companheira e ágil.",
    care_notes: "Gosta de brinquedos de morder.",
    status: "active",
    created_at: "2026-10-29T08:00:00Z",
  }
];

export const initialMockGuardians: Guardian[] = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    full_name: "Mariana Silva",
    phone: "11987654321",
    email: "mariana.silva@exemplo.com",
    notes: "Mãe do Thor. Prefere receber resumo por WhatsApp.",
    created_at: "2026-10-29T08:00:00Z",
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    full_name: "Carlos Eduardo Santos",
    phone: "11991234567",
    email: "carlos.edu@exemplo.com",
    notes: "Tutor da Pipoca. Autorizou fotos diárias.",
    created_at: "2026-10-29T08:00:00Z",
  },
  {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    full_name: "Renata Oliveira",
    phone: "11976543210",
    email: "renata.oliver@exemplo.com",
    notes: "Tutora da Mel e do Bob.",
    created_at: "2026-10-29T08:00:00Z",
  }
];

export const initialMockPetGuardians = [
  { pet_id: "11111111-1111-1111-1111-111111111111", guardian_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", relationship: "Mãe", is_primary: true },
  { pet_id: "22222222-2222-2222-2222-222222222222", guardian_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", relationship: "Pai", is_primary: true },
  { pet_id: "33333333-3333-3333-3333-333333333333", guardian_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", relationship: "Mãe", is_primary: true },
  { pet_id: "44444444-4444-4444-4444-444444444444", guardian_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", relationship: "Mãe", is_primary: true },
];

export const initialMockStaff: StaffMember[] = [
  {
    id: "99999999-9999-9999-9999-999999999999",
    name: "Ana Paula de Souza",
    role_title: "Monitora de Creche",
    active: true,
    created_at: "2026-10-29T08:00:00Z",
  }
];

export function getInitialMockTodayAttendance(): Attendance[] {
  const today = "2026-10-29";
  return [
    {
      id: "att-1",
      pet_id: "11111111-1111-1111-1111-111111111111",
      date: today,
      status: "present",
      check_in_time: `${today}T08:15:00-03:00`,
      check_out_time: null,
      created_at: "2026-10-29T08:00:00Z",
    },
    {
      id: "att-2",
      pet_id: "22222222-2222-2222-2222-222222222222",
      date: today,
      status: "present",
      check_in_time: `${today}T08:30:00-03:00`,
      check_out_time: null,
      created_at: "2026-10-29T08:00:00Z",
    },
    {
      id: "att-3",
      pet_id: "33333333-3333-3333-3333-333333333333",
      date: today,
      status: "present",
      check_in_time: `${today}T08:45:00-03:00`,
      check_out_time: null,
      created_at: "2026-10-29T08:00:00Z",
    },
    {
      id: "att-4",
      pet_id: "44444444-4444-4444-4444-444444444444",
      date: today,
      status: "expected",
      check_in_time: null,
      check_out_time: null,
      created_at: "2026-10-29T08:00:00Z",
    },
    {
      id: "att-5",
      pet_id: "55555555-5555-5555-5555-555555555555",
      date: today,
      status: "expected",
      check_in_time: null,
      check_out_time: null,
      created_at: "2026-10-29T08:00:00Z",
    }
  ];
}

export function getInitialMockTodayReports(): DailyReport[] {
  const today = "2026-10-29";
  return [
    {
      id: "rep-1",
      pet_id: "11111111-1111-1111-1111-111111111111",
      date: today,
      status: "in_progress",
      feeding: "comeu_tudo",
      feeding_notes: "Comeu toda a ração com muito apetite às 12h.",
      water: "muito",
      activities_participation: "participou",
      activities_notes: "Brincou bastante de buscar a bolinha no gramado e se refrescou na água.",
      nap_after_lunch: "sim",
      nap_notes: "Dormiu cerca de 1 hora após o almoço na sombra.",
      behavior_socialization: "Super sociável, interagiu muito bem com a Mel.",
      free_observations: "Dia super produtivo e alegre para o Thor!",
      created_at: "2026-10-29T08:00:00Z",
      photos: [
        {
          id: "photo-1",
          report_id: "rep-1",
          pet_id: "11111111-1111-1111-1111-111111111111",
          file_path: "mock/thor_1.jpg",
          storage_url: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600&q=80",
          caption: "Thor feliz após a brincadeira de bolinha!",
          created_at: "2026-10-29T08:00:00Z",
        }
      ]
    },
    {
      id: "rep-2",
      pet_id: "22222222-2222-2222-2222-222222222222",
      date: today,
      status: "completed",
      feeding: "comeu_tudo",
      feeding_notes: "Alimentou-se normalmente às 12h15.",
      water: "normal",
      activities_participation: "participou",
      activities_notes: "Participou do circuito sensorial de obstáculos.",
      nap_after_lunch: "sim",
      nap_notes: "Descansou no puff macio.",
      behavior_socialization: "Muito brincalhona e atenta aos chamados.",
      free_observations: "Comportamento exemplar hoje.",
      created_at: "2026-10-29T08:00:00Z",
      photos: [
        {
          id: "photo-2",
          report_id: "rep-2",
          pet_id: "22222222-2222-2222-2222-222222222222",
          file_path: "mock/pipoca_1.jpg",
          storage_url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80",
          caption: "Pipoca explorando os brinquedos da creche",
          created_at: "2026-10-29T08:00:00Z",
        }
      ]
    }
  ];
}
