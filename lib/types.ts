export type Role = 'member' | 'tutor' | 'faculty_rep' | 'care_liaison' | 'admin';
export type Kind = 'church' | 'tutorial' | 'unit' | 'part2';

export type Profile = {
  id: string; email: string | null; full_name: string; whatsapp: string | null;
  faculty_id: number | null; department_id: number | null; level: number | null;
  role: Role; listed: boolean; goals_enabled: boolean;
  remind_tutorials: boolean; remind_events: boolean; remind_goal: boolean; onboarded: boolean;
};
export type Faculty = { id: number; name: string; sort: number };
export type Department = { id: number; faculty_id: number; name: string };
export type EventRow = {
  id: string; title: string; description: string | null; kind: Kind;
  starts_at: string; ends_at: string | null; venue: string | null; online_link: string | null;
  faculty_id: number | null; level_min: number; level_max: number; capacity: number | null;
  tutor_id: string | null; created_by: string | null;
};
export type Signup = { id: string; event_id: string; user_id: string; status: 'going' | 'waiting' | 'cancelled' | 'attended' };
export type Slot = { id: string; user_id: string; course: string; day_of_week: number; start_time: string; end_time: string; venue: string | null };
export type Goal = { id: string; user_id: string; week_start: string; text: string; done: boolean };
export type Person = { id: string; name: string; whatsapp: string | null; title: string; kind: string; faculty_id: number | null; topics: string | null };
export type HelpRequest = {
  id: string; user_id: string; topic: string; message: string; preferred_contact: string | null;
  status: 'new' | 'assigned' | 'closed'; urgent: boolean; assigned_to: string | null; created_at: string;
};
