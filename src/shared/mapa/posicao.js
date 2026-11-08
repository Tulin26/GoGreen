export function describePositionError(e) {
  if (e?.message === 'sem-gps') return 'Este aparelho ou navegador não oferece localização. Digite o endereço.';
  if (e?.code === 1) return 'Sem permissão de localização para este site. Libere nas configurações do navegador (ícone de cadeado) e tente de novo, ou digite o endereço.';
  if (e?.code === 3) return 'A localização demorou demais para responder. Tente de novo ou digite o endereço.';
  return 'Sem sinal de localização agora. Tente em um lugar aberto ou digite o endereço.';
}

export function watchPosition(onFix, onError = () => {}) {
  if (!navigator.geolocation) { onError(new Error('sem-gps')); return () => {}; }
  const id = navigator.geolocation.watchPosition(
    (p) => onFix({ point: [p.coords.latitude, p.coords.longitude], accuracy: p.coords.accuracy, heading: p.coords.heading }),
    onError,
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

export function getBestPosition({ maxWaitMs = 12000, goodEnoughM = 60 } = {}) {
  return new Promise((resolve, reject) => {
    let best = null;
    let lastError = null;
    let settled = false;
    let stop = () => {};
    let timer = null;
    const end = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); stop(); fn(value); };
    const finish = () => (best ? end(resolve, best) : end(reject, lastError ?? new Error('sem-sinal')));
    stop = watchPosition((fix) => {
      if (!best || fix.accuracy < best.accuracy) best = fix;
      if (best.accuracy <= goodEnoughM) finish();
    }, (e) => {
      lastError = e;
      if (e?.code === 1 || e?.message === 'sem-gps') end(reject, e);
    });
    if (!settled) timer = setTimeout(finish, maxWaitMs);
  });
}
