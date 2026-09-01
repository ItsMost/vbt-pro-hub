import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { MockAthleteProfile, AthleteLiftTest } from '../data/mockAthletes';

export const STORAGE_KEY_SUPABASE_URL = 'peak_vbt_supabase_url';
export const STORAGE_KEY_SUPABASE_KEY = 'peak_vbt_supabase_key';

export interface SupabaseAthleteRow {
  id: string;
  name: string;
  name_ar: string;
  sport_event: string;
  body_weight_kg: number;
  notes: string;
  avatar_initials: string;
  color_accent: 'cyan' | 'lime' | 'emerald';
  manual_1rm_map: Record<string, number>;
  tests: AthleteLiftTest[];
  created_at?: string;
  updated_at?: string;
}

// Convert DB row (snake_case) to Application Profile (camelCase)
export function rowToAthlete(row: SupabaseAthleteRow): MockAthleteProfile {
  return {
    id: row.id,
    name: row.name,
    nameAr: row.name_ar || row.name,
    sportEvent: row.sport_event || 'Track & Field Athlete',
    bodyWeightKg: Number(row.body_weight_kg) || 75,
    notes: row.notes || '',
    avatarInitials: row.avatar_initials || 'AT',
    colorAccent: (row.color_accent as 'cyan' | 'lime' | 'emerald') || 'cyan',
    manual1RMMap: row.manual_1rm_map || {},
    tests: Array.isArray(row.tests) ? row.tests : [],
  };
}

// Convert Application Profile to DB row (snake_case)
export function athleteToRow(athlete: MockAthleteProfile): SupabaseAthleteRow {
  return {
    id: athlete.id,
    name: athlete.name,
    name_ar: athlete.nameAr || athlete.name,
    sport_event: athlete.sportEvent,
    body_weight_kg: athlete.bodyWeightKg,
    notes: athlete.notes || '',
    avatar_initials: athlete.avatarInitials,
    color_accent: athlete.colorAccent || 'cyan',
    manual_1rm_map: athlete.manual1RMMap || {},
    tests: athlete.tests || [],
  };
}

let supabaseInstance: SupabaseClient | null = null;
let currentLoadedUrl = '';
let currentLoadedKey = '';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const localUrl = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SUPABASE_URL) || '' : '').trim();
  const localKey = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) || '' : '').trim();

  const url = localUrl || envUrl;
  const anonKey = localKey || envKey;
  const isConfigured = Boolean(url && anonKey && url.startsWith('http'));

  return { url, anonKey, isConfigured };
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    supabaseInstance = null;
    return null;
  }

  if (supabaseInstance && currentLoadedUrl === url && currentLoadedKey === anonKey) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentLoadedUrl = url;
    currentLoadedKey = anonKey;
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    supabaseInstance = null;
    return null;
  }
}

export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = getSupabaseCredentials();
    const targetUrl = (customUrl || creds.url).trim();
    const targetKey = (customKey || creds.anonKey).trim();

    if (!targetUrl || !targetKey) {
      return { success: false, error: 'Project URL and Anon Key cannot be empty' };
    }

    if (!targetUrl.startsWith('http')) {
      return { success: false, error: 'URL must start with https://' };
    }

    const testClient = createClient(targetUrl, targetKey);
    const { error } = await testClient
      .from('vbt_athletes')
      .select('id')
      .limit(1);

    if (error) {
      return { success: false, error: `${error.message} (${error.code || ''})` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown network error' };
  }
}

export function saveSupabaseCredentials(url: string, key: string): void {
  localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, key.trim());
  // Reset cached instance so next call re-instantiates
  supabaseInstance = null;
}

export function clearSupabaseCredentials(): void {
  localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
  localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
  supabaseInstance = null;
}

// Fetch all athletes from Supabase
export async function fetchAthletesFromCloud(): Promise<MockAthleteProfile[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('vbt_athletes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching athletes from Supabase:', error);
    throw error;
  }

  if (!data || data.length === 0) return [];
  return data.map((row: any) => rowToAthlete(row as SupabaseAthleteRow));
}

// Upsert a single athlete
export async function upsertAthleteToCloud(athlete: MockAthleteProfile): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const row = athleteToRow(athlete);
  const { error } = await client
    .from('vbt_athletes')
    .upsert(row, { onConflict: 'id' });

  if (error) {
    console.error('Error upserting athlete to Supabase:', error);
    throw error;
  }

  return true;
}

// Delete an athlete
export async function deleteAthleteFromCloud(athleteId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('vbt_athletes')
    .delete()
    .eq('id', athleteId);

  if (error) {
    console.error('Error deleting athlete from Supabase:', error);
    throw error;
  }

  return true;
}

// Seed / Upload all local athletes to cloud in batch
export async function syncAllAthletesToCloud(athletes: MockAthleteProfile[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || athletes.length === 0) return false;

  const rows = athletes.map(athleteToRow);
  const { error } = await client
    .from('vbt_athletes')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('Error batch syncing athletes to Supabase:', error);
    throw error;
  }

  return true;
}

// Real-time channel subscription
export function subscribeToAthletesRealtime(
  onInsert: (athlete: MockAthleteProfile) => void,
  onUpdate: (athlete: MockAthleteProfile) => void,
  onDelete: (id: string) => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  const channel: RealtimeChannel = client
    .channel('public:vbt_athletes:realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'vbt_athletes' },
      (payload) => {
        if (payload.new) {
          onInsert(rowToAthlete(payload.new as SupabaseAthleteRow));
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'vbt_athletes' },
      (payload) => {
        if (payload.new) {
          onUpdate(rowToAthlete(payload.new as SupabaseAthleteRow));
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'vbt_athletes' },
      (payload) => {
        if (payload.old && payload.old.id) {
          onDelete(payload.old.id);
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
