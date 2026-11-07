
const ERRORS = [
  [/Failed to fetch|NetworkError/i, 'Sem conexão com o servidor. Confira sua internet.'],
];

export function friendly(error) {
  const msg = error?.message ?? String(error);
  const hit = ERRORS.find(([re]) => re.test(msg));
  return new Error(hit ? hit[1] : msg);
}

export function check({ data, error }) {
  if (error) throw friendly(error);
  return data;
}
