// Cadastra no Neon os motoristas de exemplo (src/config/exemplos.js) para a apresentação, ou os remove.
// São contas sem senha: ninguém consegue entrar nelas. O nome de cada uma termina com "(exemplo)".
// Uso: node --env-file=.env.local scripts/semear-exemplos.mjs [--remover]
import { neon } from '@neondatabase/serverless';
import { EXAMPLE_DAILY_RIDES } from '../src/config/exemplos.js';

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL. Rode "vercel env pull .env.local".');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const EMAIL = (n) => `exemplo-${n}@exemplo.invalid`;
const CARROS = [
  ['FIAT', 'UNO', 2018, 12.1], ['VOLKSWAGEN', 'GOL', 2020, 12.8], ['CHEVROLET', 'ONIX', 2021, 13.5], ['HYUNDAI', 'HB20', 2019, 13.2],
  ['RENAULT', 'KWID', 2022, 14.6], ['HONDA', 'CITY', 2020, 12.9], ['TOYOTA', 'COROLLA', 2019, 11.8], ['FIAT', 'ARGO', 2021, 13.8],
];
const MOTOS = [['HONDA', 'CG 160', 2021, 42], ['YAMAHA', 'FACTOR 150', 2020, 40], ['HONDA', 'BIZ 125', 2019, 45]];
// Placa fictícia e única por motorista (EXE + dígito + letra + dois dígitos), só para os exemplos.
const placa = (n) => `EXE${(n - 1) % 10}${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor((n - 1) / 10) % 26]}${String(Math.floor((n - 1) / 260)).padStart(2, '0')}`;

if (process.argv.includes('--remover')) {
  const [{ n }] = await sql`with apagadas as (delete from auth.users where email like 'exemplo-%@exemplo.invalid' returning 1) select count(*)::int n from apagadas`;
  console.log(`${n} motoristas de exemplo removidos.`);
  process.exit(0);
}

let criados = 0;
for (const [i, r] of EXAMPLE_DAILY_RIDES.entries()) {
  const n = i + 1;
  const tipo = r.tipo ?? 'carro';
  const lista = tipo === 'moto' ? MOTOS : CARROS;
  const [marca, modelo, ano, kml] = lista[i % lista.length];
  const carro = { tipo, marca, modelo, ano, placa: placa(n), combustivel: 'gasolina', km_l_gasolina: kml };
  const meta = JSON.stringify({ apelido: r.motorista, telefone: '18999990000', transportes: ['carro'], carro });
  const [novo] = await sql`insert into auth.users (email, raw_user_meta_data) values (${EMAIL(n)}, ${meta}::jsonb) on conflict (email) do nothing returning id`;
  if (!novo) continue;
  const [car] = await sql`select id from public.user_cars where user_id = ${novo.id} limit 1`;
  await sql`insert into public.daily_routes (user_id, origem, destino, from_lat, from_lng, to_lat, to_lng, ida_hora, dias, oferece_carona, car_id, vagas, papel)
    values (${novo.id}, ${r.origem}, ${r.destino}, ${r.from[0]}, ${r.from[1]}, ${r.to[0]}, ${r.to[1]}, ${r.hora}, ${`{${r.dias.join(',')}}`}::smallint[], true, ${car.id}, ${r.vagas_livres}, 'motorista')`;
  criados += 1;
}
const [{ total }] = await sql`select count(*)::int total from auth.users where email like 'exemplo-%@exemplo.invalid'`;
console.log(`${criados} novos; ${total} motoristas de exemplo no banco.`);
