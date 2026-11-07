
import test from 'node:test';
import assert from 'node:assert/strict';
import { demoStore } from '../../src/dados/demo/index.js';
import { createRemoteStore } from '../../src/dados/remoto/index.js';

const names = (store) => Object.keys(store).filter((k) => typeof store[k] === 'function').sort();
const real = createRemoteStore();

test('demonstração e o servidor têm as mesmas funções', () => {

  assert.deepEqual(names(demoStore).filter((n) => n !== 'reset'), names(real));
});

test('cada modo se identifica', () => {
  assert.equal(demoStore.mode, 'demo');
  assert.equal(real.mode, 'remoto');
});

test('na demonstração, recomeçar limpa conta e carros', async () => {
  await demoStore.signUp({ apelido: 'Teste' });
  await demoStore.addCar({ marca: 'A', modelo: 'B', ano: 2020, placa: 'ABC1234', combustivel: 'gasolina', km_l_gasolina: 10 });
  assert.equal((await demoStore.listCars()).length, 1);
  await demoStore.reset();
  assert.equal(await demoStore.getUser(), null);
  assert.equal((await demoStore.listCars()).length, 0);
});
