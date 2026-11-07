                                                                                                           
                                                                                                         
                                                                                        
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { caronaSupabase } from '../../src/dados/supabase/carona.js';
import { trajetosSupabase } from '../../src/dados/supabase/trajetos.js';

const ANA = '11111111-1111-1111-1111-111111111111';
const BETO = '22222222-2222-2222-2222-222222222222';
let db;
let uid = null;

const STUB = `
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
const CASTS = { p_dias: '::smallint[]' };

                                                                                         
const client = {
  async rpc(name, args = {}) {
    const keys = Object.keys(args);
    const call = `select * from public.${name}(${keys.map((k, i) => `${k} => $${i + 1}${CASTS[k] ?? ''}`).join(', ')})`;
    await db.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.uid', '${uid ?? ''}', false);`);
    try {
      const { rows } = await db.query(call, keys.map((k) => args[k]));
      const scalar = rows.length === 1 && Object.keys(rows[0]).length === 1 && Object.keys(rows[0])[0] === name;
      return { data: scalar ? rows[0][name] : rows, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message } };
    } finally {
      await db.exec(`reset role; select set_config('request.uid', '', false);`);
    }
  },
};
const trajetos = trajetosSupabase(client);
const carona = caronaSupabase(client);

before(async () => {
  db = new PGlite();
  await db.exec(STUB);
  for (const f of ['001_init', '002_carros_e_caronas', '003_usuario', '004_transportes_e_eletricos', '005_trajetos', '006_chat_carona', '007_foco_carona']) {
    await db.exec(readFileSync(new URL(`../../supabase/migrations/${f}.sql`, import.meta.url), 'utf8'));
  }
  await db.exec(`insert into auth.users values ('${ANA}', '{"apelido":"Ana","telefone":"18999990001"}'), ('${BETO}', '{"apelido":"Beto","telefone":"18999990002"}');
    insert into public.user_cars (user_id, marca, modelo, ano, placa, combustivel, km_l_gasolina) values ('${ANA}', 'FIAT', 'UNO', 2020, 'AAA1B23', 'gasolina', 12);`);
});

test('fluxo de carona: o motorista salva a rota, o passageiro pede, o motorista aceita e os dois conversam', async () => {
  uid = ANA;
  const [car] = (await db.query(`select id from public.user_cars where user_id = '${ANA}'`)).rows;
  const driverId = await trajetos.saveDailyRoute({ origem: 'Terminal Urbano', destino: 'Fatec Araçatuba', from: [-21.203, -50.4385], to: [-21.1816, -50.4497], ida_hora: '07:00', volta_hora: null, dias: [1, 2, 3, 4, 5], oferece_carona: true, car_id: car.id, vagas: 2 });
  const mine = await trajetos.listDailyRoutes();
  assert.equal(mine[0].papel, 'motorista');
  assert.deepEqual(mine[0].from, [-21.203, -50.4385]);

  uid = BETO;
  const passengerId = await trajetos.saveDailyRoute({ origem: 'Praça Rui Barbosa', destino: 'Fatec Araçatuba', from: [-21.2062, -50.4389], to: [-21.1816, -50.4497], ida_hora: '07:05', volta_hora: null, dias: [1, 2, 3, 4, 5], oferece_carona: false });
  const found = await trajetos.matchDailyRides({ dias: [1] });
  assert.equal(found.length, 1);
  assert.equal(found[0].id, driverId);
  assert.equal(found[0].motorista, 'Ana');
  assert.equal(found[0].vagas_livres, 2);
  assert.deepEqual(found[0].to, [-21.1816, -50.4497]);
  assert.ok(!('telefone' in found[0]) && !('placa' in found[0]));

  const requestId = await carona.requestCarpool({ driverRouteId: driverId, passengerRouteId: passengerId, mensagem: 'Posso ir com você?' });
  uid = ANA;
  const [asDriver] = await carona.listCarpoolRequests();
  assert.equal(asDriver.papel, 'motorista');
  assert.equal(asDriver.status, 'pendente');
  assert.equal(asDriver.telefone, null);
  assert.equal(asDriver.outro, 'Beto');
  assert.deepEqual(asDriver.passenger_route.from, [-21.2062, -50.4389]);
  assert.deepEqual(asDriver.driver_route.to, [-21.1816, -50.4497]);

  await carona.respondCarpoolRequest(requestId, true);
  await carona.sendRequestMessage(requestId, 'Combinado! R$ 5 pela gasolina.');
  uid = BETO;
  const [asPassenger] = await carona.listCarpoolRequests();
  assert.equal(asPassenger.status, 'aceita');
  assert.equal(asPassenger.telefone, '18999990001');
  assert.ok(asPassenger.placa);
  await carona.sendRequestMessage(requestId, 'Fechado, obrigado!');
  assert.deepEqual((await carona.listRequestMessages(requestId)).map((m) => [m.mine, m.body]), [[false, 'Combinado! R$ 5 pela gasolina.'], [true, 'Fechado, obrigado!']]);
});

test('erros do banco chegam como mensagem legível para a tela', async () => {
  uid = BETO;
  await assert.rejects(carona.sendRequestMessage('00000000-0000-0000-0000-000000000000', 'oi'), /Conversa não encontrada/);
  await assert.rejects(carona.requestCarpool({ driverRouteId: 'nao-e-uuid', passengerRouteId: 'x' }));
});
