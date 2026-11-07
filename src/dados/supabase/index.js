                                                                   
import { createClient } from '@supabase/supabase-js';
import { caronasSupabase } from './caronas.js';
import { carrosSupabase } from './carros.js';
import { contaSupabase } from './conta.js';
import { onibusSupabase } from './onibus.js';
import { caronaSupabase } from './carona.js';
import { chatSupabase } from './chat.js';
import { trajetosSupabase } from './trajetos.js';

export function createSupabaseStore(url, key) {
  const db = createClient(url, key);
  return { mode: 'supabase', ...contaSupabase(db), ...onibusSupabase(db), ...carrosSupabase(db), ...caronasSupabase(db), ...trajetosSupabase(db), ...chatSupabase(db), ...caronaSupabase(db) };
}
