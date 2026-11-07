const TZ = 'America/Sao_Paulo';

                                                                                                    
export function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return { weekday: get('weekday'), minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
}

export function dayType(weekday) {
  if (weekday === 'Sat') return 'sabado';
  if (weekday === 'Sun') return 'domingo';
  return 'util';
}

export const DAY_LABEL = { util: 'dia útil', sabado: 'sábado', domingo: 'domingo' };

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const NEXT = { Mon: 'Tue', Tue: 'Wed', Wed: 'Thu', Thu: 'Fri', Fri: 'Sat', Sat: 'Sun', Sun: 'Mon' };

   
                                                                                                      
                                             
   
export function nextDepartures(direction, date = new Date(), count = 3) {
  const { weekday, minutes } = localParts(date);
  const out = [];
  let wd = weekday;
  for (let offset = 0; offset < 4 && out.length < count; offset++) {
    const type = dayType(wd);
    for (const t of direction[type] ?? []) {
      const m = toMin(t);
      if (offset === 0 && m < minutes) continue;
      out.push({ time: t, inMinutes: m - minutes + offset * 1440, day: type, today: offset === 0 });
      if (out.length === count) break;
    }
    wd = NEXT[wd];
  }
  return out;
}

export function formatWait(min) {
  if (min < 1) return 'agora';
  if (min < 60) return `em ${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `em ${h} h ${m} min` : `em ${h} h`;
}
