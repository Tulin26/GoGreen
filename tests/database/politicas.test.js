                                                                                                           
                                                                                                                 
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const ANA = '11111111-1111-1111-1111-111111111111';
const BETO = '22222222-2222-2222-2222-222222222222';
const ADMIN = '33333333-3333-3333-3333-333333333333';
let db;

const SUPABASE_STUB = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant anon, authenticated, service_role to postgres;
  create schema auth; create schema storage;
  grant usage on schema public, auth, storage to anon, authenticated;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant select, insert, delete on storage.objects to anon, authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
  grant execute on function storage.foldername(text) to anon, authenticated;
`;

                                                                        
async function as(uid, sql, params) {
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.uid', '${uid ?? ''}', false);`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec(`reset role; select set_config('request.uid', '', false);`);
  }
}
const insertReport = (uid, extra = '') => as(uid, `insert into public.reports (category, severity, lat, lng${extra ? ', description' : ''}) values ('buraco', 'grave', -21.2, -50.43${extra ? `, '${extra}'` : ''}) returning id, category`);

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of ['001_init.sql', '002_carros_e_caronas.sql', '003_usuario.sql', '004_transportes_e_eletricos.sql', '005_trajetos.sql', '006_chat_carona.sql', '007_foco_carona.sql']) {
    await db.exec(readFileSync(new URL(`../../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  await db.exec(`insert into auth.users values
    ('${ANA}', '{"apelido":"Ana","telefone":"(18) 99999-0001"}'), ('${BETO}', '{"apelido":"Beto","telefone":"18999990002"}'), ('${ADMIN}', '{"apelido":"Equipe"}');
    update public.profiles set is_admin = true where id = '${ADMIN}';`);
});

test('cadastro cria perfil e guarda só os dígitos do telefone', async () => {
  const [p] = await as(ANA, 'select apelido, telefone, is_admin from public.profiles where id = $1', [ANA]);
  assert.deepEqual(p, { apelido: 'Ana', telefone: '18999990001', is_admin: false });
});

test('cada pessoa só vê o próprio perfil', async () => {
  assert.equal((await as(ANA, 'select id from public.profiles')).length, 1);
  await assert.rejects(as(null, 'select id from public.profiles'));
});

test('ninguém se promove a admin pelo navegador', async () => {
  await assert.rejects(as(ANA, `update public.profiles set is_admin = true where id = '${ANA}'`));
  await as(ANA, `update public.profiles set apelido = 'Aninha' where id = '${ANA}'`);
  assert.equal((await as(ANA, 'select apelido from public.profiles'))[0].apelido, 'Aninha');
});

test('visitante lê relatos mas não cria', async () => {
  await assert.rejects(as(null, `insert into public.reports (category, lat, lng) values ('buraco', -21.2, -50.43)`));
  assert.ok(Array.isArray(await as(null, 'select id, category, status from public.reports')));
});

test('pessoa logada cria relato em nome próprio', async () => {
  const [r] = await insertReport(ANA);
  assert.equal(r.category, 'buraco');
  const [{ user_id: owner }] = (await db.query('select user_id from public.reports where id = $1', [r.id])).rows;
  assert.equal(owner, ANA);
});

test('não dá para forjar o autor nem o status ao criar', async () => {
  await assert.rejects(as(ANA, `insert into public.reports (category, lat, lng, user_id) values ('buraco', -21.2, -50.43, '${BETO}')`));
  await assert.rejects(as(ANA, `insert into public.reports (category, lat, lng, status) values ('buraco', -21.2, -50.43, 'resolvido')`));
});

test('o autor do relato não é público', async () => {
  await assert.rejects(as(null, 'select user_id from public.reports'));
  await assert.rejects(as(BETO, 'select user_id from public.reports'));
});

test('relato fora de Araçatuba é recusado', async () => {
  await assert.rejects(as(ANA, `insert into public.reports (category, lat, lng) values ('buraco', -23.55, -46.63)`));
});

test('só o autor ou a equipe apaga', async () => {
  const [r] = await insertReport(ANA);
  await as(BETO, 'delete from public.reports where id = $1', [r.id]);
  assert.equal((await as(ANA, 'select id from public.reports where id = $1', [r.id])).length, 1);
  await as(ANA, 'delete from public.reports where id = $1', [r.id]);
  assert.equal((await as(ANA, 'select id from public.reports where id = $1', [r.id])).length, 0);
  const [x] = await insertReport(ANA);
  await as(ADMIN, 'delete from public.reports where id = $1', [x.id]);
  assert.equal((await as(ANA, 'select id from public.reports where id = $1', [x.id])).length, 0);
});

test('my_report_ids devolve só os da pessoa', async () => {
  const [r] = await insertReport(BETO);
  const ids = (await as(BETO, 'select * from public.my_report_ids() as id')).map((x) => x.id);
  assert.ok(ids.includes(r.id));
  const ana = (await as(ANA, 'select * from public.my_report_ids() as id')).map((x) => x.id);
  assert.ok(!ana.includes(r.id));
});

test('confirmação conta uma vez e não vale para o próprio relato', async () => {
  const [r] = await insertReport(ANA);
  await assert.rejects(as(ANA, 'select public.confirm_report($1)', [r.id]));
  const [first] = await as(BETO, 'select public.confirm_report($1) as n', [r.id]);
  const [second] = await as(BETO, 'select public.confirm_report($1) as n', [r.id]);
  assert.equal(first.n, 1);
  assert.equal(second.n, 1);
  await assert.rejects(as(null, 'select public.confirm_report($1)', [r.id]));
});

test('só a equipe muda o status', async () => {
  const [r] = await insertReport(ANA);
  await assert.rejects(as(ANA, `select public.set_report_status($1, 'resolvido')`, [r.id]));
  await assert.rejects(as(ANA, `update public.reports set status = 'resolvido' where id = '${r.id}'`));
  await as(ADMIN, `select public.set_report_status($1, 'resolvido')`, [r.id]);
  assert.equal((await as(null, 'select status from public.reports where id = $1', [r.id]))[0].status, 'resolvido');
});

test('limite de 15 relatos por dia', async () => {
  const uid = '44444444-4444-4444-4444-444444444444';
  await db.exec(`insert into auth.users values ('${uid}', '{}')`);
  for (let i = 0; i < 15; i++) await insertReport(uid);
  await assert.rejects(insertReport(uid), /Limite de 15/);
});

test('posição de ônibus: pública e sem ligação com a pessoa', async () => {
  const [{ id: trip }] = await as(ANA, `select public.start_bus_trip('104', 'Terminal') as id`);
  await as(ANA, 'select public.report_bus_position($1, -21.2, -50.43)', [trip]);
  const rows = await as(null, 'select * from public.bus_positions');
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['direction', 'id', 'lat', 'line_code', 'lng', 'recorded_at', 'token']);
  await assert.rejects(as(null, 'select * from public.bus_trips'));
  await assert.rejects(as(ANA, 'select * from public.bus_trips'));
  await as(ANA, 'select public.end_bus_trip($1)', [trip]);
  const [link] = (await db.query('select public_token from public.bus_trips where id = $1', [trip])).rows;
  assert.equal(link.public_token, null);
});

test('visitante não informa posição e ninguém usa a viagem de outra pessoa', async () => {
  await assert.rejects(as(null, `select public.start_bus_trip('104', 'Terminal')`));
  await assert.rejects(as(null, `insert into public.bus_positions (token, line_code, lat, lng) values (gen_random_uuid(), '104', -21.2, -50.43)`));
  const [{ id: trip }] = await as(ANA, `select public.start_bus_trip('104', 'Terminal') as id`);
  await assert.rejects(as(BETO, 'select public.report_bus_position($1, -21.2, -50.43)', [trip]), /encerrada/);
  await as(ANA, 'select public.end_bus_trip($1)', [trip]);
});

test('posição fora da cidade é recusada e posição antiga some da leitura', async () => {
  const [{ id: trip }] = await as(ANA, `select public.start_bus_trip('104', 'Terminal') as id`);
  await assert.rejects(as(ANA, 'select public.report_bus_position($1, -23.55, -46.63)', [trip]), /fora da área/);
  await db.exec(`insert into public.bus_positions (token, line_code, lat, lng, recorded_at) values (gen_random_uuid(), '999', -21.2, -50.43, now() - interval '10 minutes')`);
  assert.equal((await as(null, `select id from public.bus_positions where line_code = '999'`)).length, 0);
  await as(ANA, 'select public.end_bus_trip($1)', [trip]);
});

test('intervalo mínimo entre posições', async () => {
  await db.exec('delete from public.bus_positions');
  const [{ id: trip }] = await as(BETO, `select public.start_bus_trip('112', null) as id`);
  await as(BETO, 'select public.report_bus_position($1, -21.2, -50.43)', [trip]);
  await as(BETO, 'select public.report_bus_position($1, -21.2, -50.43)', [trip]);
  assert.equal((await as(null, `select id from public.bus_positions where line_code = '112'`)).length, 1);
  await as(BETO, 'select public.end_bus_trip($1)', [trip]);
});

test('telefone inválido no cadastro não impede a conta', async () => {
  const uid = '55555555-5555-5555-5555-555555555555';
  await db.exec(`insert into auth.users values ('${uid}', '{"telefone":"123"}')`);
  assert.equal((await as(uid, 'select telefone from public.profiles'))[0].telefone, null);
});

test('pontos e ranking não existem mais', async () => {
  await assert.rejects(as(ANA, 'select * from public.ranking_turmas()'));
  await assert.rejects(as(ANA, 'select * from public.my_points()'));
  await assert.rejects(as(ANA, 'select turma from public.profiles'));
});

const CAR = `(marca, modelo, ano, placa, combustivel, km_l_gasolina, km_l_etanol) values ('HONDA', 'CITY', 2026`;
const addCar = (uid, placa) => as(uid, `insert into public.user_cars ${CAR}, '${placa}', 'flex', 13.9, 9.8) returning id`);

test('carro é só de quem cadastrou', async () => {
  const [{ id }] = await addCar(ANA, 'ABC1D23');
  assert.equal((await as(ANA, 'select id from public.user_cars')).length, 1);
  assert.equal((await as(BETO, 'select id from public.user_cars')).length, 0);
  await assert.rejects(as(null, 'select id from public.user_cars'));
  assert.equal((await as(BETO, `delete from public.user_cars where id = '${id}' returning id`)).length, 0);
  assert.equal((await as(BETO, `update public.user_cars set placa = 'XXX0000' where id = '${id}' returning id`)).length, 0);
                                                            
  await assert.rejects(as(BETO, `insert into public.user_cars (user_id, marca, modelo, ano, placa, combustivel, km_l_gasolina) values ('${ANA}', 'A', 'B', 2020, 'AAA1111', 'gasolina', 10)`));
});

test('carro exige placa válida, consumo do combustível e placa única', async () => {
  await assert.rejects(addCar(ANA, 'abc'));
  await assert.rejects(addCar(ANA, 'ABC1D23'));
  await assert.rejects(as(ANA, `insert into public.user_cars (marca, modelo, ano, placa, combustivel, km_l_gasolina) values ('A', 'B', 2020, 'AAA1111', 'flex', 10)`));
  await addCar(BETO, 'ABC1D23');                                              
});

test('limite de 10 carros', async () => {
  const uid = '66666666-6666-6666-6666-666666666666';
  await db.exec(`insert into auth.users values ('${uid}', '{}')`);
  for (let i = 0; i < 10; i++) await addCar(uid, `AAA100${i}`);
  await assert.rejects(addCar(uid, 'AAA2000'), /Limite de 10 carros/);
});

const inHours = (h) => new Date(Date.now() + h * 3600000).toISOString();
const myCar = async (uid) => (await as(uid, 'select id from public.user_cars limit 1'))[0].id;
const offer = async (uid, vagas = 1, car) => (await as(uid, 'select public.offer_ride($1, $2, $3, $4, $5, $6) as id', [car ?? await myCar(uid), 'Terminal', 'Fatec', inHours(5), vagas, 'sem desvio']))[0].id;
const ask = async (uid, ride) => (await as(uid, 'select public.request_ride($1, $2) as id', [ride, 'oi']))[0].id;
const listed = async (uid, ride) => (await as(uid, 'select * from public.list_rides()')).find((r) => r.id === ride);

test('tabelas de carona ficam fechadas e anônimo não vê nada', async () => {
  await assert.rejects(as(ANA, 'select * from public.rides'));
  await assert.rejects(as(ANA, 'select * from public.ride_requests'));
  await assert.rejects(as(null, 'select * from public.list_rides()'));
});

test('oferecer exige carro próprio, telefone e horário futuro', async () => {
  const beto = await myCar(BETO);
  await assert.rejects(as(ANA, 'select public.offer_ride($1, $2, $3, $4, $5, $6)', [beto, 'A1', 'B1', inHours(5), 1, '']), /seus carros/);
  await assert.rejects(as(ANA, 'select public.offer_ride($1, $2, $3, $4, $5, $6)', [await myCar(ANA), 'A1', 'B1', inHours(-5), 1, '']), /futuro/);
  const uid = '77777777-7777-7777-7777-777777777777';
  await db.exec(`insert into auth.users values ('${uid}', '{}')`);
  const [{ id }] = await addCar(uid, 'CCC1234');
  await assert.rejects(as(uid, 'select public.offer_ride($1, $2, $3, $4, $5, $6)', [id, 'A1', 'B1', inHours(5), 1, '']), /telefone/);
});

test('telefone e placa só aparecem depois de aceitar a vaga', async () => {
  const ride = await offer(ANA);
  let seen = await listed(BETO, ride);
  assert.equal(seen.motorista, 'Aninha');
  assert.equal(seen.telefone, null);
  assert.equal(seen.placa, null);
  assert.equal(seen.vagas_livres, 1);
  const request = await ask(BETO, ride);
  seen = await listed(BETO, ride);
  assert.equal(seen.meu_status, 'pendente');
  assert.equal(seen.telefone, null);
  const [pending] = (await as(ANA, 'select * from public.my_ride_requests()')).filter((q) => q.ride_id === ride);
  assert.equal(pending.passageiro, 'Beto');
  assert.equal(pending.telefone, null);

  await assert.rejects(as(BETO, 'select public.respond_request($1, true)', [request]), /Só quem oferece/);
  await as(ANA, 'select public.respond_request($1, true)', [request]);
  seen = await listed(BETO, ride);
  assert.equal(seen.telefone, '18999990001');
  assert.equal(seen.placa, 'ABC1D23');
  assert.equal(seen.vagas_livres, 0);
  assert.equal((await as(ANA, 'select * from public.my_ride_requests()')).find((q) => q.id === request).telefone, '18999990002');
                                                         
  assert.equal((await listed(ADMIN, ride)).telefone, null);
  assert.equal((await as(BETO, 'select * from public.my_ride_requests()')).length, 0);
});

test('não aceita mais gente que vagas nem responde duas vezes', async () => {
  const c = '88888888-8888-8888-8888-888888888888';
  await db.exec(`insert into auth.users values ('${c}', '{"apelido":"Caio","telefone":"18999990003"}')`);
  const ride = await offer(ANA);
  const r1 = await ask(BETO, ride);
  const r2 = await ask(c, ride);
  await as(ANA, 'select public.respond_request($1, true)', [r1]);
  await assert.rejects(as(ANA, 'select public.respond_request($1, true)', [r2]), /mais vagas/);
  await assert.rejects(as(ANA, 'select public.respond_request($1, false)', [r1]), /já foi respondido/);
  await as(ANA, 'select public.respond_request($1, false)', [r2]);
  await assert.rejects(ask(c, ride), /já pediu/);
});

test('a própria carona não pode ser pedida e pedido cancelado pode voltar', async () => {
  const ride = await offer(ANA);
  await assert.rejects(ask(ANA, ride), /é sua/);
  const request = await ask(BETO, ride);
  await assert.rejects(as(ADMIN, 'select public.cancel_request($1)', [request]));
  await as(BETO, 'select public.cancel_request($1)', [request]);
  assert.equal((await listed(BETO, ride)).meu_status, 'cancelada');
  assert.equal(await ask(BETO, ride), request);
});

test('carona cancelada avisa só quem pediu vaga e fecha para novos pedidos', async () => {
  const ride = await offer(ANA, 2);
  await ask(BETO, ride);
  await assert.rejects(as(BETO, 'select public.cancel_ride($1)', [ride]));
  await as(ANA, 'select public.cancel_ride($1)', [ride]);
  assert.equal((await listed(BETO, ride)).cancelada, true);
  assert.equal(await listed(ADMIN, ride), undefined);
  const c = '88888888-8888-8888-8888-888888888888';
  await assert.rejects(ask(c, ride), /não está mais disponível/);
});

test('apagar o carro não apaga a carona', async () => {
  const uid = '99999999-9999-9999-9999-999999999999';
  await db.exec(`insert into auth.users values ('${uid}', '{"apelido":"Dani","telefone":"18999990004"}')`);
  const [{ id }] = await addCar(uid, 'DDD1234');
  const ride = await offer(uid, 1, id);
  await as(uid, `delete from public.user_cars where id = '${id}'`);
  const seen = await listed(BETO, ride);
  assert.equal(seen.car_label, 'HONDA CITY 2026');
});

test('usuário: cadastro, login e repetição', async () => {
  const u1 = 'aaaaaaaa-0000-4000-8000-000000000001';
  const u2 = 'aaaaaaaa-0000-4000-8000-000000000002';
  await db.exec(`insert into auth.users (id, raw_user_meta_data, email) values ('${u1}', '{"usuario":" Maria.S "}', 'maria@teste.com')`);
  assert.equal((await as(u1, 'select usuario from public.profiles'))[0].usuario, 'maria.s');
                                                                       
  await db.exec(`insert into auth.users (id, raw_user_meta_data, email) values ('${u2}', '{"usuario":"maria.s"}', 'outra@teste.com')`);
  assert.equal((await as(u2, 'select usuario from public.profiles'))[0].usuario, null);
  await assert.rejects(as(u2, `update public.profiles set usuario = 'maria.s' where id = '${u2}'`));
  await assert.rejects(as(u2, `update public.profiles set usuario = 'NÃO VALE' where id = '${u2}'`));
  await as(u2, `update public.profiles set usuario = 'outra' where id = '${u2}'`);
                                                                                  
  assert.equal((await as(null, `select public.email_do_usuario('MARIA.S') as e`))[0].e, 'maria@teste.com');
  assert.equal((await as(null, `select public.email_do_usuario('ninguem') as e`))[0].e, null);
  assert.equal((await as(null, `select public.usuario_disponivel('maria.s') as d`))[0].d, false);
  assert.equal((await as(null, `select public.usuario_disponivel('livre') as d`))[0].d, true);
  await assert.rejects(as(null, 'select email from auth.users'));
  await assert.rejects(as(null, 'select usuario from public.profiles'));
});

test('cadastro guarda como a pessoa se locomove e o carro, sem deixar a placa nos dados da conta', async () => {
  const uid = 'bbbbbbbb-0000-4000-8000-000000000001';
  const meta = { apelido: 'Eva', transportes: ['carro', 'bike', 'foguete'], carro: { marca: 'HONDA', modelo: 'CITY', ano: 2026, placa: 'EVA1D23', combustivel: 'flex', km_l_gasolina: 13.9, km_l_etanol: 9.8, origem_consumo: 'inmetro' } };
  await db.query('insert into auth.users (id, raw_user_meta_data) values ($1, $2)', [uid, JSON.stringify(meta)]);
  const [p] = await as(uid, 'select transportes from public.profiles');
  assert.deepEqual(p.transportes.sort(), ['bike', 'carro']);
  const cars = await as(uid, 'select marca, placa, origem_consumo from public.user_cars');
  assert.deepEqual(cars, [{ marca: 'HONDA', placa: 'EVA1D23', origem_consumo: 'inmetro' }]);
  const stored = (await db.query('select raw_user_meta_data as m from auth.users where id = $1', [uid])).rows[0].m;
  assert.equal(stored.carro, undefined);
  assert.equal(stored.apelido, 'Eva');
});

test('carro inválido no cadastro não impede a conta', async () => {
  const uid = 'bbbbbbbb-0000-4000-8000-000000000002';
  await db.query('insert into auth.users (id, raw_user_meta_data) values ($1, $2)', [uid, JSON.stringify({ carro: { marca: 'X', ano: 'abc', placa: 'ruim' } })]);
  assert.equal((await as(uid, 'select id from public.profiles')).length, 1);
  assert.equal((await as(uid, 'select id from public.user_cars')).length, 0);
});

test('carro elétrico precisa do consumo em kWh', async () => {
  const uid = 'bbbbbbbb-0000-4000-8000-000000000001';
  await assert.rejects(as(uid, `insert into public.user_cars (marca, modelo, ano, placa, combustivel) values ('BYD', 'D', 2024, 'ELE1A11', 'eletrico')`));
  await as(uid, `insert into public.user_cars (marca, modelo, ano, placa, combustivel, kwh_km) values ('BYD', 'D', 2024, 'ELE1A11', 'eletrico', 0.114)`);
  await as(uid, `update public.profiles set transportes = '{onibus,ape}' where id = '${uid}'`);
  await assert.rejects(as(uid, `update public.profiles set transportes = '{foguete}' where id = '${uid}'`));
});

test('foto só entra na pasta da própria pessoa', async () => {
  await as(ANA, `insert into storage.objects (bucket_id, name) values ('report-photos', '${ANA}/a.jpg')`);
  await assert.rejects(as(ANA, `insert into storage.objects (bucket_id, name) values ('report-photos', '${BETO}/a.jpg')`));
  await assert.rejects(as(null, `insert into storage.objects (bucket_id, name) values ('report-photos', 'x/a.jpg')`));
});

                             
const saveRoute = (uid, { dias = '{1,2,3,4,5}', oferece = false, car = null, vagas = null, ida = '07:00' } = {}) => as(uid,
  'select public.save_daily_route($1, $2, $3, $4, $5, $6, $7, $8, $9::smallint[], $10, $11, $12) as id',
  ['Terminal Urbano', 'Fatec Araçatuba', -21.203, -50.4385, -21.1816, -50.4497, ida, null, dias, oferece, car, vagas]);

test('trajetos: tabela fechada e só a própria pessoa vê os seus', async () => {
  await assert.rejects(as(ANA, 'select * from public.daily_routes'));
  await assert.rejects(as(null, 'select * from public.my_daily_routes()'));
  const [{ id }] = await saveRoute(ANA);
  assert.deepEqual((await as(ANA, 'select id from public.my_daily_routes()')).map((r) => r.id), [id]);
  assert.equal((await as(BETO, 'select id from public.my_daily_routes() where id = $1', [id])).length, 0);
});

test('trajetos: sem dias ou com horário torto é recusado', async () => {
  await assert.rejects(saveRoute(ANA, { dias: '{}' }));
  await assert.rejects(saveRoute(ANA, { ida: '7h' }));
});

test('trajetos: oferecer carona exige carro próprio e telefone, e a rota vira de motorista (sem carona avulsa)', async () => {
  await assert.rejects(saveRoute(ANA, { oferece: true, car: null, vagas: 2 }));
  await assert.rejects(saveRoute(ANA, { oferece: true, car: await myCar(BETO), vagas: 2 }), /seus carros/);
  const [{ id }] = await saveRoute(ANA, { oferece: true, car: await myCar(ANA), vagas: 2 });
  const [mine] = await as(ANA, 'select papel, ride_id, vagas from public.my_daily_routes() where id = $1', [id]);
  assert.equal(mine.papel, 'motorista');
  assert.equal(mine.ride_id, null);
  assert.equal(mine.vagas, 2);
  const [plain] = await as(ANA, 'select papel from public.my_daily_routes() where id = $1', [(await saveRoute(ANA))[0].id]);
  assert.equal(plain.papel, 'passageiro');
});

test('trajetos: motoristas compatíveis não trazem telefone nem placa', async () => {
  const rows = await as(BETO, 'select * from public.match_daily_rides($1::smallint[])', ['{1,2}']);
  assert.ok(rows.length >= 1);
  assert.ok(rows.every((r) => !('telefone' in r) && !('placa' in r)));
  assert.ok(rows.every((r) => r.motorista));
  assert.equal((await as(ANA, 'select * from public.match_daily_rides($1::smallint[])', ['{1,2}'])).filter((r) => r.motorista === 'Ana').length, 0);
});

test('trajetos: outra pessoa não apaga o trajeto alheio', async () => {
  const [{ id }] = await saveRoute(ANA);
  await assert.rejects(as(BETO, 'select public.delete_daily_route($1)', [id]));
  await as(ANA, 'select public.delete_daily_route($1)', [id]);
  assert.equal((await as(ANA, 'select id from public.my_daily_routes() where id = $1', [id])).length, 0);
});

                           
const say = (uid, ride, passenger, body) => as(uid, 'select public.send_ride_message($1, $2, $3) as id', [ride, passenger, body]);
const thread = (uid, ride, passenger) => as(uid, 'select * from public.list_ride_messages($1, $2)', [ride, passenger]);

test('chat: passageiro escreve, motorista responde, e só os dois leem', async () => {
  const ride = await offer(ANA);
  await say(BETO, ride, null, 'Oi! Quanto fica a carona?');
  assert.deepEqual((await thread(ANA, ride, BETO)).map((m) => m.body), ['Oi! Quanto fica a carona?']);
  await say(ANA, ride, BETO, 'R$ 5 pela gasolina.');
  const msgs = await thread(BETO, ride, null);
  assert.deepEqual(msgs.map((m) => [m.mine, m.body]), [[true, 'Oi! Quanto fica a carona?'], [false, 'R$ 5 pela gasolina.']]);
  await assert.rejects(thread(ADMIN, ride, BETO));
  await assert.rejects(say(ADMIN, ride, BETO, 'intruso'));
});

test('chat: motorista não puxa conversa e ninguém escreve em carona própria como passageiro', async () => {
  const ride = await offer(ANA);
  await assert.rejects(say(ANA, ride, BETO, 'oi'), /conversa/i);
  await assert.rejects(say(ANA, ride, null, 'oi'));
});

test('chat: mensagem vazia, longa demais ou de anônimo é recusada, e a tabela é fechada', async () => {
  const ride = await offer(ANA);
  await assert.rejects(say(BETO, ride, null, '   '));
  await assert.rejects(say(BETO, ride, null, 'x'.repeat(501)));
  await assert.rejects(say(null, ride, null, 'oi'));
  await assert.rejects(as(BETO, 'select * from public.ride_messages'));
});

test('chat: lista de conversas mostra o outro lado e não traz telefone', async () => {
  const ride = await offer(ANA);
  await say(BETO, ride, null, 'Bom dia');
  const [asDriver] = (await as(ANA, 'select * from public.my_ride_chats()')).filter((c) => c.ride_id === ride);
  assert.equal(asDriver.sou_motorista, true);
  assert.equal(asDriver.outro, 'Beto');
  const [asPassenger] = (await as(BETO, 'select * from public.my_ride_chats()')).filter((c) => c.ride_id === ride);
  assert.equal(asPassenger.outro, (await as(ANA, 'select apelido from public.profiles where id = $1', [ANA]))[0].apelido);
  assert.ok(!('telefone' in asDriver));
});

                                                                
const CARLA = '88888888-8888-8888-8888-888888888888';
const driverRoute = async (uid, vagas = 2) => (await saveRoute(uid, { oferece: true, car: await myCar(uid), vagas }))[0].id;
const passengerRoute = async (uid) => (await saveRoute(uid))[0].id;
const ask2 = (uid, driverRoute, passengerRoute, msg = 'Posso ir com você?') => as(uid, 'select public.request_carpool($1, $2, $3) as id', [driverRoute, passengerRoute, msg]);
const mine = (uid) => as(uid, 'select * from public.my_carpool_requests()');

test('solicitação: passageiro pede, o motorista vê sem telefone, aceita, e então o passageiro vê telefone e placa', async () => {
  const d = await driverRoute(ANA);
  const p = await passengerRoute(BETO);
  const [{ id }] = await ask2(BETO, d, p);
  const asDriver = (await mine(ANA)).find((r) => r.id === id);
  assert.equal(asDriver.papel, 'motorista');
  assert.equal(asDriver.status, 'pendente');
  assert.equal(asDriver.telefone, null);
  assert.equal(asDriver.outro, 'Beto');
  assert.equal(asDriver.passenger_route.origem, 'Terminal Urbano');
  const asPassenger = (await mine(BETO)).find((r) => r.id === id);
  assert.equal(asPassenger.papel, 'passageiro');
  assert.equal(asPassenger.telefone, null);
  assert.equal(asPassenger.placa, null);
  await as(ANA, 'select public.respond_carpool_request($1, true)', [id]);
  const accepted = (await mine(BETO)).find((r) => r.id === id);
  assert.equal(accepted.status, 'aceita');
  assert.equal(accepted.telefone, '18999990001');
  assert.ok(accepted.placa);
  assert.equal((await mine(ANA)).find((r) => r.id === id).telefone, '18999990002');
});

test('solicitação: pedido repetido, de rota alheia ou para si mesmo é recusado', async () => {
  const d = await driverRoute(ANA);
  const p = await passengerRoute(BETO);
  await ask2(BETO, d, p);
  await assert.rejects(ask2(BETO, d, p), /já pediu/i);
  await assert.rejects(ask2(ANA, d, await passengerRoute(BETO)), /sua rota|suas rotas/i);                                     
  await assert.rejects(ask2(ANA, d, await passengerRoute(ANA)), /sua própria|si mesm/i);
  await assert.rejects(ask2(BETO, p, p), /motorista/i);                                       
});

test('solicitação: só o motorista responde, só o passageiro cancela, e vagas esgotadas travam o aceite', async () => {
  await db.exec(`insert into auth.users values ('${CARLA}', '{"apelido":"Carla","telefone":"18999990003"}') on conflict do nothing`);
  const d = await driverRoute(ANA, 1);
  const [{ id: a }] = await ask2(BETO, d, await passengerRoute(BETO));
  const [{ id: b }] = await ask2(CARLA, d, await passengerRoute(CARLA));
  await assert.rejects(as(BETO, 'select public.respond_carpool_request($1, true)', [a]));
  await assert.rejects(as(ADMIN, 'select public.respond_carpool_request($1, true)', [a]));
  await as(ANA, 'select public.respond_carpool_request($1, true)', [a]);
  await assert.rejects(as(ANA, 'select public.respond_carpool_request($1, true)', [b]), /vagas/i);
  await as(ANA, 'select public.respond_carpool_request($1, false)', [b]);
  assert.equal((await mine(CARLA)).find((r) => r.id === b).status, 'recusada');
  await assert.rejects(as(ANA, 'select public.cancel_carpool_request($1)', [a]));
  await as(BETO, 'select public.cancel_carpool_request($1)', [a]);
  assert.equal((await mine(BETO)).find((r) => r.id === a).status, 'cancelada');
});

test('solicitação: motoristas compatíveis mostram as vagas que restam, sem telefone nem placa', async () => {
  const d = await driverRoute(ANA, 3);
  const rows = await as(BETO, 'select * from public.match_daily_rides($1::smallint[])', ['{1}']);
  const row = rows.find((r) => r.id === d);
  assert.ok(row);
  assert.equal(row.vagas_livres, 3);
  assert.ok(!('telefone' in row) && !('placa' in row));
});

test('solicitação: tabelas fechadas e anônimo recusado', async () => {
  await assert.rejects(as(ANA, 'select * from public.carpool_requests'));
  await assert.rejects(as(ANA, 'select * from public.request_messages'));
  await assert.rejects(as(null, 'select * from public.my_carpool_requests()'));
  await assert.rejects(as(null, 'select public.request_carpool($1, $2, $3)', [ANA, BETO, 'oi']));
});

test('chat da solicitação: só o motorista e o passageiro leem e escrevem', async () => {
  const d = await driverRoute(ANA);
  const [{ id }] = await ask2(BETO, d, await passengerRoute(BETO));
  const say2 = (uid, body) => as(uid, 'select public.send_request_message($1, $2) as id', [id, body]);
  await say2(BETO, 'Quanto fica?');
  await say2(ANA, 'R$ 5 pela gasolina.');
  const msgs = await as(BETO, 'select * from public.list_request_messages($1)', [id]);
  assert.deepEqual(msgs.map((m) => [m.mine, m.body]), [[true, 'Quanto fica?'], [false, 'R$ 5 pela gasolina.']]);
  await assert.rejects(as(ADMIN, 'select * from public.list_request_messages($1)', [id]));
  await assert.rejects(say2(ADMIN, 'intruso'));
  await assert.rejects(say2(BETO, '   '));
  await assert.rejects(say2(BETO, 'x'.repeat(501)));
  await assert.rejects(as(null, 'select public.send_request_message($1, $2)', [id, 'oi']));
});

test('chat da solicitação: depois de recusada ou cancelada não aceita mensagem nova', async () => {
  const d = await driverRoute(ANA);
  const [{ id }] = await ask2(BETO, d, await passengerRoute(BETO));
  await as(ANA, 'select public.respond_carpool_request($1, false)', [id]);
  await assert.rejects(as(BETO, 'select public.send_request_message($1, $2)', [id, 'oi?']), /encerrad|recusad/i);
});
