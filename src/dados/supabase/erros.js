                                                                   
const ERRORS = [
  [/Invalid login credentials/i, 'E-mail, usuário ou senha incorretos.'],
  [/already registered/i, 'Já existe uma conta com este e-mail.'],
  [/Email not confirmed/i, 'Confirme seu e-mail antes de entrar. Procure a mensagem na caixa de entrada.'],
  [/Password should be/i, 'Use uma senha com pelo menos 6 caracteres.'],
  [/email rate limit/i, 'O envio de e-mails de confirmação chegou ao limite por hora. Espere um pouco e tente de novo.'],
  [/rate limit/i, 'Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.'],
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
