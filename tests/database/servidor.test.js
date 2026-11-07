import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { createRemoteStore } from '../../src/dados/remoto/index.js';
import { tratarAuth, tratarDb } from '../../api/_lib/rotas.js';
import { bancoDeTeste, navegador } from '../helpers/servidor.js';

let db;
const CABECALHOS = { 'x-gogreen': '1' };
const auth = (corpo, cabecalhos = CABECALHOS) => tratarAuth({ metodo: 'POST', cabecalhos, corpo });
const lojaDe = (nav) => createRemoteStore(nav.fetchFn);
const CARRO = { tipo: 'carro', marca: 'FIAT', modelo: 'UNO', ano: 2020, placa: 'AAA1B23', combustivel: 'gasolina', km_l_gasolina: 12 };

before(async () => { db = await bancoDeTeste(); });

test('cadastro: cria a conta, entra sozinho e o perfil vem do banco', async () => {
  const loja = lojaDe(navegador());
  const { user } = await loja.signUp({ email: 'Ana@Exemplo.com', password: 'senha123', apelido: 'Ana', usuario: 'ana.souza', telefone: '18999990001', transportes: ['carro', 'bike'], carro: CARRO });
  assert.equal(user.email, 'ana@exemplo.com');
  assert.equal(user.apelido, 'Ana');
  assert.equal(user.usuario, 'ana.souza');
  assert.deepEqual([...user.transportes].sort(), ['bike', 'carro']);
  assert.equal((await loja.getUser()).id, user.id);
  assert.equal((await loja.listCars()).length, 1);
});

test('cadastro recusa e-mail repetido, usuário repetido, e-mail torto e senha curta', async () => {
  const loja = lojaDe(navegador());
  await assert.rejects(loja.signUp({ email: 'ana@exemplo.com', password: 'outra123', apelido: 'X' }), /Já existe uma conta/);
  await assert.rejects(loja.signUp({ email: 'x@exemplo.com', password: 'outra123', apelido: 'X', usuario: 'ana.souza' }), /usuário já existe/);
  await assert.rejects(loja.signUp({ email: 'sem-arroba', password: 'outra123', apelido: 'X' }), /e-mail válido/);
  await assert.rejects(loja.signUp({ email: 'y@exemplo.com', password: '123', apelido: 'X' }), /6 a 72/);
});

test('login por e-mail e por usuário; senha errada é recusada com a mesma mensagem', async () => {
  const porEmail = await lojaDe(navegador()).signIn({ email: 'ANA@exemplo.com', password: 'senha123' });
  const porUsuario = await lojaDe(navegador()).signIn({ email: 'ana.souza', password: 'senha123' });
  assert.equal(porEmail.user.id, porUsuario.user.id);
  await assert.rejects(lojaDe(navegador()).signIn({ email: 'ana@exemplo.com', password: 'errada' }), /incorretos/);
  await assert.rejects(lojaDe(navegador()).signIn({ email: 'ninguem@exemplo.com', password: 'senha123' }), /incorretos/);
});

test('depois de 8 falhas seguidas, bloqueia; outra origem não é afetada', async () => {
  const de = (ip) => ({ ...CABECALHOS, 'x-forwarded-for': ip });
  for (let i = 0; i < 8; i++) await auth({ acao: 'entrar', login: 'bia@exemplo.com', password: 'x' }, de('9.9.9.9'));
  assert.equal((await auth({ acao: 'entrar', login: 'bia@exemplo.com', password: 'x' }, de('9.9.9.9'))).status, 429);
  assert.equal((await auth({ acao: 'entrar', login: 'bia@exemplo.com', password: 'x' }, de('8.8.8.8'))).status, 401);
});

test('só aceita POST com o cabeçalho próprio', async () => {
  assert.equal((await tratarAuth({ metodo: 'GET', cabecalhos: CABECALHOS, corpo: {} })).status, 405);
  assert.equal((await tratarAuth({ metodo: 'POST', cabecalhos: {}, corpo: { acao: 'eu' } })).status, 403);
  assert.equal((await tratarDb({ metodo: 'POST', cabecalhos: {}, corpo: { op: 'listCars' } })).status, 403);
});

test('cookie adulterado ou ausente vale como visitante', async () => {
  const nav = navegador();
  const loja = lojaDe(nav);
  await loja.signIn({ email: 'ana@exemplo.com', password: 'senha123' });
  assert.ok(await loja.getUser());
  nav.adulterar();
  assert.equal(await loja.getUser(), null);
  await assert.rejects(loja.listCars(), /Entre na sua conta/);
});

test('funções internas do servidor e argumentos estranhos não passam pelo /api/db', async () => {
  const chama = (corpo) => tratarDb({ metodo: 'POST', cabecalhos: CABECALHOS, corpo });
  assert.equal((await chama({ op: 'rpc', fn: 'email_do_usuario', args: { p_usuario: 'ana.souza' } })).status, 404);
  assert.equal((await chama({ op: 'rpc', fn: 'usuario_disponivel', args: { p_usuario: 'x' } })).status, 404);
  assert.equal((await chama({ op: 'rpc', fn: 'my_daily_routes; drop table profiles', args: {} })).status, 404);
  assert.equal((await chama({ op: 'rpc', fn: 'my_daily_routes', args: { 'p_a) from x; --': 1 } })).status, 400);
  assert.equal((await chama({ op: 'inventada' })).status, 404);
});

test('visitante não vê nem cria nada: o banco recusa mesmo pelas funções liberadas', async () => {
  const visitante = lojaDe(navegador());
  await assert.rejects(visitante.listDailyRoutes());
  assert.deepEqual(await visitante.listPositions(), []);
});

test('fluxo de carona pelo servidor: pedir, aceitar, ver telefone e placa, conversar', async () => {
  const ana = lojaDe(navegador());
  const beto = lojaDe(navegador());
  await ana.signIn({ email: 'ana@exemplo.com', password: 'senha123' });
  await beto.signUp({ email: 'beto@exemplo.com', password: 'senha123', apelido: 'Beto', telefone: '18999990002' });
  const [car] = await ana.listCars();
  const motorista = await ana.saveDailyRoute({ origem: 'Terminal Urbano', destino: 'Fatec Araçatuba', from: [-21.203, -50.4385], to: [-21.1816, -50.4497], ida_hora: '07:00', volta_hora: null, dias: [1, 2, 3, 4, 5], oferece_carona: true, car_id: car.id, vagas: 2 });
  const passageiro = await beto.saveDailyRoute({ origem: 'Praça Rui Barbosa', destino: 'Fatec Araçatuba', from: [-21.2062, -50.4389], to: [-21.1816, -50.4497], ida_hora: '07:05', volta_hora: null, dias: [1, 2, 3, 4, 5], oferece_carona: false });

  const achados = await beto.matchDailyRides({ dias: [1] });
  assert.equal(achados.length, 1);
  assert.equal(achados[0].motorista, 'Ana');
  assert.ok(!('telefone' in achados[0]) && !('placa' in achados[0]));

  const pedido = await beto.requestCarpool({ driverRouteId: motorista, passengerRouteId: passageiro, mensagem: 'Posso ir?' });
  const [recebido] = await ana.listCarpoolRequests();
  assert.equal(recebido.status, 'pendente');
  assert.equal(recebido.telefone, null);
  await ana.respondCarpoolRequest(pedido, true);
  await ana.sendRequestMessage(pedido, 'Combinado! R$ 5.');
  const [aceito] = await beto.listCarpoolRequests();
  assert.equal(aceito.status, 'aceita');
  assert.equal(aceito.telefone, '18999990001');
  assert.ok(aceito.placa);
  assert.deepEqual((await beto.listRequestMessages(pedido)).map((m) => [m.mine, m.body]), [[false, 'Combinado! R$ 5.']]);
});

test('erros escritos no banco chegam legíveis para a tela', async () => {
  const beto = lojaDe(navegador());
  await beto.signIn({ email: 'beto@exemplo.com', password: 'senha123' });
  await assert.rejects(beto.sendRequestMessage('00000000-0000-0000-0000-000000000000', 'oi'), /Conversa não encontrada/);
});

test('atualizar perfil: grava, e o usuário de outra pessoa é recusado', async () => {
  const beto = lojaDe(navegador());
  await beto.signIn({ email: 'beto@exemplo.com', password: 'senha123' });
  await beto.updateProfile({ apelido: 'Beto Silva', usuario: 'beto.silva', telefone: '18999990002', transportes: ['onibus'] });
  const eu = await beto.getUser();
  assert.deepEqual([eu.apelido, eu.usuario, eu.transportes], ['Beto Silva', 'beto.silva', ['onibus']]);
  await assert.rejects(beto.updateProfile({ apelido: 'B', usuario: 'ana.souza', telefone: null, transportes: [] }), /usuário já existe/);
});

test('apagar a conta remove os dados e encerra a sessão', async () => {
  const nav = navegador();
  const loja = lojaDe(nav);
  await loja.signUp({ email: 'cleo@exemplo.com', password: 'senha123', apelido: 'Cleo', carro: { ...CARRO, placa: 'CLE1A23' } });
  assert.equal((await loja.listCars()).length, 1);
  await loja.deleteAccount();
  assert.equal(nav.cookie(), '');
  assert.equal(await loja.getUser(), null);
  assert.equal((await db.query("select count(*)::int n from auth.users where email = 'cleo@exemplo.com'")).rows[0].n, 0);
  assert.equal((await db.query("select count(*)::int n from public.user_cars where placa = 'CLE1A23'")).rows[0].n, 0);
  await assert.rejects(lojaDe(navegador()).signIn({ email: 'cleo@exemplo.com', password: 'senha123' }), /incorretos/);
});

test('cadastro com moto guarda o veículo como moto', async () => {
  const loja = lojaDe(navegador());
  await loja.signUp({ email: 'dani@exemplo.com', password: 'senha123', apelido: 'Dani', carro: { ...CARRO, tipo: 'moto', marca: 'HONDA', modelo: 'CG 160', placa: 'MOT1A23', km_l_gasolina: 42 } });
  const [moto] = await loja.listCars();
  assert.equal(moto.tipo, 'moto');
});

test('visitante recebe 401 claro nas funções que exigem conta', async () => {
  const r = await tratarDb({ metodo: 'POST', cabecalhos: CABECALHOS, corpo: { op: 'rpc', fn: 'my_daily_routes', args: {} } });
  assert.equal(r.status, 401);
  assert.match(r.corpo.erro, /Entre na sua conta/);
});

test('visitante vê as caronas, mas sem número da casa, com coordenadas aproximadas e sem telefone nem placa', async () => {
  const dono = lojaDe(navegador());
  await dono.signUp({ email: 'dora@exemplo.com', password: 'senha123', apelido: 'Dora', telefone: '18999990003', carro: { ...CARRO, placa: 'DOR1A23' } });
  const [car] = await dono.listCars();
  await dono.saveDailyRoute({ origem: 'Rua das Flores, 123, Jardim Teste', destino: 'Fatec Araçatuba', from: [-21.20347, -50.43851], to: [-21.18163, -50.44969], ida_hora: '07:30', volta_hora: null, dias: [2], oferece_carona: true, car_id: car.id, vagas: 2 });
  const visitante = lojaDe(navegador());
  const [v] = (await visitante.matchDailyRides({ dias: [2] })).filter((m) => m.motorista === 'Dora');
  assert.equal(v.origem, 'Rua das Flores, Jardim Teste');
  assert.equal(v.destino, 'Fatec Araçatuba');
  assert.deepEqual(v.from, [-21.203, -50.439]);
  assert.ok(!('telefone' in v) && !('placa' in v));
  const logado = lojaDe(navegador());
  await logado.signIn({ email: 'beto@exemplo.com', password: 'senha123' });
  const [l] = (await logado.matchDailyRides({ dias: [2] })).filter((m) => m.motorista === 'Dora');
  assert.equal(l.origem, 'Rua das Flores, 123, Jardim Teste');
  assert.deepEqual(l.from, [-21.20347, -50.43851]);
});
