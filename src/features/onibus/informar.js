import { BUS } from '../../config/transporte.js';
import { store } from '../../dados/index.js';
import { session, setTrip } from '../../shared/estado.js';
import { esc } from '../../shared/formato.js';
import { closeButton, openDialog } from '../../shared/ui/dialogo.js';
import { $ } from '../../shared/ui/dom.js';
import { toast } from '../../shared/ui/toast.js';

                                                                                              
let watchId = null;
let tripTimer = null;

export async function stopReporting(reason) {
  const trip = session.trip;
  if (!trip) return;
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  clearTimeout(tripTimer);
  setTrip(null);
  try { await store.endTrip(trip); } catch {                                        }
  toast(reason === 'tempo' ? `Paramos de informar depois de ${BUS.tripMaxMin} min. Obrigado.` : 'Obrigado por informar.');
}

function startReporting(trip) {
  trip.sent = 0;
  trip.lastSent = 0;
  setTrip(trip);
  tripTimer = setTimeout(() => stopReporting('tempo'), BUS.tripMaxMin * 60000);
  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const now = Date.now();
      if (now - trip.lastSent < BUS.pingSeconds * 1000) return;
      trip.lastSent = now;
      try {
        await store.reportPosition(trip, pos.coords.latitude, pos.coords.longitude);
        trip.sent += 1;
        trip.offline = false;
        setTrip(trip);
      } catch (e) {
        trip.offline = !navigator.onLine;
        setTrip(trip);
        if (/encerrada|fora da área/i.test(e.message)) { toast(e.message, { type: 'erro' }); stopReporting(); }
      }
    },
    () => { toast('Sem o GPS não dá para informar o ônibus. Ative a localização do navegador.', { type: 'erro' }); stopReporting(); },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );
}

export function askConsent(line, direction) {
  const d = openDialog({
    html: `<div class="dialogo__corpo">
      <div class="dialogo__cabeca"><h2 class="dialogo__titulo">Avisar quem está no ponto?</h2>${closeButton}</div>
      <p>Sua localização vai sem nome, só enquanto você informar. Paramos sozinhos depois de ${BUS.tripMaxMin} min, e as posições são apagadas em até 30 min.</p>
      <p class="campo__ajuda">Só use dentro do ônibus da linha ${esc(line.code)}. Mantenha a tela do celular ligada.</p>
      <div class="dialogo__acoes"><button class="btn btn-outline-success botao botao--secundario" type="button" data-fechar>Agora não</button><button class="btn btn-success botao botao--primario" type="button" data-ok>Começar a informar</button></div>
    </div>`,
  });
  $('[data-ok]', d).onclick = async () => {
    d.close();
    if (!navigator.geolocation) { toast('Este navegador não informa a localização.', { type: 'erro' }); return; }
    try {
      const trip = await store.startTrip(line.code, direction);
      startReporting({ ...trip, lineName: line.name });
    } catch (e) {
      toast(e.message, { type: 'erro' });
    }
  };
}
