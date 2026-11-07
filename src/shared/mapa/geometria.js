const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

                                                        
export function haversine(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

                                                                                                    
export function distanceToSegment(p, a, b) {
  const k = Math.cos(rad(p[0]));
  const toXY = (q) => [rad(q[1] - p[1]) * k * R, rad(q[0] - p[0]) * R];
  const A = toXY(a);
  const B = toXY(b);
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(A[0] * dx + A[1] * dy) / len2));
  return Math.hypot(A[0] + t * dx, A[1] + t * dy);
}

export function distanceToPolyline(p, line) {
  if (!line?.length) return Infinity;
  if (line.length === 1) return haversine(p, line[0]);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) best = Math.min(best, distanceToSegment(p, line[i - 1], line[i]));
  return best;
}

export function polylineLength(line) {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += haversine(line[i - 1], line[i]);
  return total;
}

                                                          
export function pointAlong(line, fraction) {
  const f = Math.max(0, Math.min(1, fraction));
  const target = polylineLength(line) * f;
  let walked = 0;
  for (let i = 1; i < line.length; i++) {
    const seg = haversine(line[i - 1], line[i]);
    if (walked + seg >= target) {
      const t = seg === 0 ? 0 : (target - walked) / seg;
      return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t];
    }
    walked += seg;
  }
  return line[line.length - 1];
}

export function inBounds(p, b) {
  return p[0] >= b.minLat && p[0] <= b.maxLat && p[1] >= b.minLng && p[1] <= b.maxLng;
}

   
                                                                                                                          
                                                                                              
   
export function projectOnPolyline(p, line) {
  if (!line?.length) return { along: 0, offset: Infinity };
  if (line.length === 1) return { along: 0, offset: haversine(p, line[0]) };
  let best = { along: 0, offset: Infinity };
  let walked = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const seg = haversine(a, b);
    const k = Math.cos(rad(p[0]));
    const toXY = (q) => [rad(q[1] - p[1]) * k * R, rad(q[0] - p[0]) * R];
    const [ax, ay] = toXY(a);
    const [bx, by] = toXY(b);
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const offset = Math.hypot(ax + t * dx, ay + t * dy);
    if (offset < best.offset) best = { along: walked + t * seg, offset };
    walked += seg;
  }
  return best;
}
