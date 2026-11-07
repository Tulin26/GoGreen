import { PRODUCTION_URL } from '../config/cidade.js';

   
                                                 
                                                                                                            
   
export async function fetchDoSite(path, { timeoutMs = 25000, isValid = () => true } = {}) {
  for (const base of ['', PRODUCTION_URL]) {
    try {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) continue;
      const json = await res.json();
      if (isValid(json)) return json;
    } catch {                       }
  }
  return null;
}
