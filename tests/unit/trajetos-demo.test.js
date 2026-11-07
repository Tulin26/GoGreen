import test from 'node:test';
import assert from 'node:assert/strict';
import { demoStore } from '../../src/dados/demo/index.js';

const route = (extra = {}) => ({ origem: 'Terminal Urbano', destino: 'Fatec Araçatuba', from: [-21.203, -50.4385], to: [-21.1816, -50.4497], ida_hora: '07:00', volta_hora: null, dias: [1, 2, 3, 4, 5], oferece_carona: false, ...extra });

test('trajeto salvo aparece na lista e pode ser apagado', async () => {
  await demoStore.reset();
  await demoStore.signUp({ apelido: 'Teste' });
  const id = await demoStore.saveDailyRoute(route());
  assert.deepEqual((await demoStore.listDailyRoutes()).map((r) => r.id), [id]);
  await demoStore.deleteDailyRoute(id);
  assert.equal((await demoStore.listDailyRoutes()).length, 0);
});

test('trajeto que oferece carona vira rota de motorista e exige carro e vagas', async () => {
  await demoStore.reset();
  await demoStore.signUp({ apelido: 'Teste' });
  await assert.rejects(demoStore.saveDailyRoute(route({ oferece_carona: true })), /ve[ií]culo/i);
  await demoStore.addCar({ marca: 'A', modelo: 'B', ano: 2020, placa: 'ABC1234', combustivel: 'gasolina', km_l_gasolina: 10 });
  const [car] = await demoStore.listCars();
  const id = await demoStore.saveDailyRoute(route({ oferece_carona: true, car_id: car.id, vagas: 2 }));
  assert.equal((await demoStore.listDailyRoutes()).find((r) => r.id === id).papel, 'motorista');
});

test('trajeto sem dias é recusado', async () => {
  await assert.rejects(demoStore.saveDailyRoute(route({ dias: [] })), /dia/);
});
