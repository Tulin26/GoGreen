import { demoStore } from './demo/index.js';
import { createSupabaseStore } from './supabase/index.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const store = url && key ? createSupabaseStore(url, key) : demoStore;
export const isDemo = store.mode === 'demo';
