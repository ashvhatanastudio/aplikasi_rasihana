import { createClient } from '@supabase/supabase-js';

// Prioritas: Environment Variables, jika kosong gunakan Hardcoded Fallback
const SUPABASE_URL_DEFAULT = 'https://sjvpwiwqyyzmmxidoqrd.supabase.co';
const SUPABASE_ANON_KEY_DEFAULT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdnB3aXdxeXl6bW14aWRvcXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzMxNjAsImV4cCI6MjA5MzMwOTE2MH0.Rfg9Q7NmLjfZDSGbqENhg1YsCD7LWNxbp7kr4C34YrA';

const cleanStr = (str: string | undefined): string => {
  if (!str) return '';
  let cleaned = str.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  
  // Hapus segmentasi path yang sering menyebabkan error 404/Invalid Path pada Supabase Client
  if (cleaned.includes('.supabase.co')) {
    const url = new URL(cleaned);
    cleaned = `${url.protocol}//${url.hostname}`;
  }
  
  return cleaned;
};

const getRawEnv = (key: string): string => {
  const val = import.meta.env[key];
  if (!val || val === '""' || val === "''" || val === '""' || val === "undefined") return '';
  return val;
};

const rawUrl = getRawEnv('VITE_SUPABASE_URL') || SUPABASE_URL_DEFAULT;
const rawKey = getRawEnv('VITE_SUPABASE_ANON_KEY') || SUPABASE_ANON_KEY_DEFAULT;

const supabaseUrl = cleanStr(rawUrl);
const supabaseAnonKey = cleanStr(rawKey);

export const isSupabaseConfigured = Boolean(supabaseUrl.startsWith('http') && supabaseAnonKey.length > 20);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'super_admin' | 'admin' | 'kasir';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}
