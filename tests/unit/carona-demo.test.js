import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { demoStore } from '../../src/dados/demo/index.js';

const route = (extra = {}) => ({ origem: 'Terminal Urbano', destino: 'Fatec Araçatuba', from: [-21.203169, -50.4385078], to: [-21.1816274, -50.4496867], ida_hora: '07:00', volta_hora: null, dias: [1, 2, 3, 4, 5], oferece_carona: false, ...extra });

beforeEach(async () => {
  await demoStore.reset();
  await demoStore.signUp({ apelido: 'Teste', telefone: '18999990000' });
});

test('a rota salva tem papel: passageiro por padrão, motorista quando oferece carona', async () => {
  const p = await demoStore.saveDailyRoute(route());
  await demoStore.addCar({ marca: 'A', modelo: 'B', ano: 2020, placa: 'ABC1234', combustivel: 'gasolina', km_l_gasolina: 10 });
  const [car] = await demoStore.listCars();
  const d = await demoStore.saveDailyRoute(route({ oferece_carona: true, car_id: car.id, vagas: 2 }));
  const routes = await demoStore.listDailyRoutes();
  assert.equal(routes.find((r) => r.id === p).papel, 'passageiro');
  assert.equal(routes.find((r) => r.id === d).papel, 'motorista');
});

test('motorista sem carro ou sem vagas é recusado', async () => {
  await assert.rejects(demoStore.saveDailyRoute(route({ oferece_carona: true })), /ve[ií]culo/i);
});

test('passageiro pede carona a um motorista de exemplo e o pedido aparece como pendente', async () => {
  const p = await demoStore.saveDailyRoute(route());
  const [driver] = await demoStore.matchDailyRides({ dias: [1] });
  const id = await demoStore.requestCarpool({ driverRouteId: driver.id, passengerRouteId: p, mensagem: 'Posso ir?' });
  const [req] = await demoStore.listCarpoolRequests();
  assert.equal(req.id, id);
  assert.equal(req.papel, 'passageiro');
  assert.equal(req.status, 'pendente');
  assert.equal(req.outro, driver.motorista);
  assert.equal(req.telefone, null);
  assert.deepEqual(req.driver_route.from, driver.from);
  assert.deepEqual(req.passenger_route.to, route().to);
});

test('pedido repetido é recusado', async () => {
  const p = await demoStore.saveDailyRoute(route());
  const [driver] = await demoStore.matchDailyRides({ dias: [1] });
  await demoStore.requestCarpool({ driverRouteId: driver.id, passengerRouteId: p });
  await assert.rejects(demoStore.requestCarpool({ driverRouteId: driver.id, passengerRouteId: p }), /já pediu/i);
});

test('o motorista de exemplo "aceita" depois de alguns segundos, e só então aparecem telefone e placa fictícios', async () => {
  const p = await demoStore.saveDailyRoute(route());
  const [driver] = await demoStore.matchDailyRides({ dias: [1] });
  await demoStore.requestCarpool({ driverRouteId: driver.id, passengerRouteId: p });
  const real = Date.now;
  Date.now = () => real() + 20000;
  try {
    const [req] = await demoStore.listCarpoolRequests();
    assert.equal(req.status, 'aceita');
    assert.ok(req.telefone);
    assert.ok(req.placa);
  } finally { Date.now = real; }
});

test('quem salva uma rota de motorista recebe uma solicitação de exemplo para ver o desvio', async () => {
  await demoStore.addCar({ marca: 'A', modelo: 'B', ano: 2020, placa: 'ABC1234', combustivel: 'gasolina', km_l_gasolina: 10 });
  const [car] = await demoStore.listCars();
  const d = await demoStore.saveDailyRoute(route({ oferece_carona: true, car_id: car.id, vagas: 2 }));
  const [req] = (await demoStore.listCarpoolRequests()).filter((r) => r.papel === 'motorista');
  assert.equal(req.status, 'pendente');
  assert.equal(req.driver_route.id, d);
  assert.ok(req.passenger_route.from && req.passenger_route.to);
  assert.equal(req.isExample, true);
});

test('motorista aceita ou recusa, e depois não responde de novo', async () => {
  await demoStore.addCar({ marca: 'A', modelo: 'B', ano: 2020, placa: 'ABC1234', combustivel: 'gasolina', km_l_gasolina: 10 });
  const [car] = await demoStore.listCars();
  await demoStore.saveDailyRoute(route({ oferece_carona: true, car_id: car.id, vagas: 2 }));
  const [req] = await demoStore.listCarpoolRequests();
  await demoStore.respondCarpoolRequest(req.id, true);
  assert.equal((await demoStore.listCarpoolRequests())[0].status, 'aceita');
  assert.ok((await demoStore.listCarpoolRequests())[0].telefone);
  await assert.rejects(demoStore.respondCarpoolRequest(req.id, false), /já foi respondido/i);
});

test('passageiro cancela o pedido', async () => {
  const p = await demoStore.saveDailyRoute(route());
  const [driver] = await demoStore.matchDailyRides({ dias: [1] });
  const id = await demoStore.requestCarpool({ driverRouteId: driver.id, passengerRouteId: p });
  await demoStore.cancelCarpoolRequest(id);
  assert.equal((await demoStore.listCarpoolRequests())[0].status, 'cancelada');
});

test('chat do pedido: manda, o outro lado de exemplo responde, e mensagem vazia ou depois de cancelar é recusada', async () => {
  const p = await demoStore.saveDailyRoute(route());
  const [driver] = await demoStore.matchDailyRides({ dias: [1] });
  const id = await demoStore.requestCarpool({ driverRouteId: driver.id, passengerRouteId: p });
  await demoStore.sendRequestMessage(id, 'Quanto fica?');
  const msgs = await demoStore.listRequestMessages(id);
  assert.deepEqual(msgs.map((m) => m.mine), [true, false]);
  assert.match(msgs[1].body, /R\$/);
  await assert.rejects(demoStore.sendRequestMessage(id, '   '), /Escreva/);
  await demoStore.cancelCarpoolRequest(id);
  await assert.rejects(demoStore.sendRequestMessage(id, 'oi'), /encerrad/i);
});

test('sem conta não pede nem conversa', async () => {
  await demoStore.reset();
  await assert.rejects(demoStore.requestCarpool({ driverRouteId: 'exd-1', passengerRouteId: 'x' }), /conta/i);
});
