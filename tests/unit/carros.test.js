import test from 'node:test';
import assert from 'node:assert/strict';
import { co2PerKm, fuelsOf, tripChoices } from '../../src/features/carros/economia.js';
import { carFieldsFromEntry, isValidPlate, normalizePlate, versionsOf } from '../../src/features/carros/catalogo.js';
import { isValidPhone } from '../../src/shared/validacao.js';
import { buildOptions } from '../../src/features/rotas/opcoes.js';

const PRICES = { gasolina: 6.30, etanol: 3.59, diesel: 7.32 };
const CITY = { id: 'a', marca: 'HONDA', modelo: 'CITY', ano: 2026, combustivel: 'flex', km_l_gasolina: 13.9, km_l_etanol: 9.8, co2_g_km_gasolina: 95, co2_g_km_etanol: 0, origem_consumo: 'inmetro' };
const OLD = { id: 'b', marca: 'FIAT', modelo: 'UNO', ano: 2012, combustivel: 'gasolina', km_l_gasolina: 11, origem_consumo: 'manual' };

test('flex testa os dois combustíveis', () => {
  assert.deepEqual(fuelsOf(CITY), ['gasolina', 'etanol']);
  assert.deepEqual(fuelsOf(OLD), ['gasolina']);
});

test('escolhe o carro e o combustível mais baratos do trajeto', () => {
  const [first, second, third] = tripChoices([OLD, CITY], 10, PRICES);
  assert.equal(first.car.modelo, 'CITY');
  assert.equal(first.fuel, 'etanol');
  assert.ok(Math.abs(first.money - 3.663) < 0.01);
  assert.equal(second.fuel, 'gasolina');
  assert.equal(third.car.modelo, 'UNO');
});

test('com etanol caro, o mesmo carro passa para a gasolina', () => {
  const [first] = tripChoices([CITY], 10, { ...PRICES, etanol: 5.5 });
  assert.equal(first.fuel, 'gasolina');
});

test('CO2 usa o Inmetro e, à mão, é calculado pelo consumo', () => {
  assert.equal(co2PerKm(CITY, 'gasolina'), 95);
  assert.equal(co2PerKm(CITY, 'etanol'), 0);
  assert.ok(Math.abs(co2PerKm(OLD, 'gasolina') - 1330 / 11) < 1e-9);
});

const route = (km, minutes) => ({ km, minutes, geometry: [[-21.2, -50.43], [-21.21, -50.44]] });
const routes = { foot: [route(5, 60)], bike: [route(5, 20)], car: [route(5, 10)] };

test('a opção de carro usa o gasto do carro cadastrado', () => {
  const car = buildOptions(routes, {}, { cars: [CITY], prices: PRICES }).find((o) => o.mode === 'car');
  assert.equal(car.choice.fuel, 'etanol');
  assert.ok(Math.abs(car.money - (5 / 9.8) * 3.59) < 1e-9);
});

test('etanol não vira carro sem emissão na comparação', () => {
  const car = buildOptions(routes, {}, { cars: [CITY], prices: PRICES }).find((o) => o.mode === 'car');
  assert.ok(Math.abs(car.co2 - 98.2 * 5) < 1e-9);
});

test('gasolina usa o CO2 do próprio carro', () => {
  const car = buildOptions(routes, {}, { cars: [CITY], prices: { ...PRICES, etanol: 9 } }).find((o) => o.mode === 'car');
  assert.equal(car.choice.fuel, 'gasolina');
  assert.equal(car.co2, 95 * 5);
});

test('sem carro cadastrado, segue a estimativa geral com o preço da semana', () => {
  const car = buildOptions(routes, {}, { cars: [], prices: PRICES }).find((o) => o.mode === 'car');
  assert.equal(car.choice, undefined);
  assert.ok(Math.abs(car.money - (5 / 12) * 6.30) < 1e-9);
});

test('placa antiga e Mercosul', () => {
  assert.equal(normalizePlate('abc-1d23'), 'ABC1D23');
  assert.ok(isValidPlate('ABC1234'));
  assert.ok(isValidPlate('ABC1D23'));
  assert.ok(!isValidPlate('AB12345'));
  assert.ok(isValidPhone('18999990000'));
  assert.ok(!isValidPhone('123'));
});

test('versão vem só da tabela mais próxima do ano do carro', () => {
  const row = (ciclo, versao, km_g) => ({ marca: 'X', modelo: 'Y', versao, motor: '1.0', combustivel: 'F', ciclo, km_e: 8, km_g });
  const catalog = [row(2014, 'Antiga', 12), row(2025, 'Nova', 14)];
  assert.deepEqual(versionsOf(catalog, 'X', 'Y', 2012).map((v) => v.versao), ['Antiga']);
  assert.deepEqual(versionsOf(catalog, 'X', 'Y', 2026).map((v) => v.versao), ['Nova']);
  assert.deepEqual(versionsOf(catalog, 'X', 'Y', '').map((v) => v.versao), ['Nova']);
  assert.deepEqual(versionsOf(catalog, 'Z', 'Y', 2020), []);
});

const EV = { id: 'c', marca: 'BYD', modelo: 'DOLPHIN', ano: 2024, combustivel: 'eletrico', kwh_km: 0.12, origem_consumo: 'inmetro' };

test('carro elétrico gasta por kWh', () => {
  const [choice] = tripChoices([EV], 10, { ...PRICES, eletrico: 1 });
  assert.equal(choice.fuel, 'eletrico');
  assert.ok(Math.abs(choice.money - 1.2) < 1e-9);
  assert.equal(choice.co2, 0);
});

test('elétrico também não vira carro sem emissão na comparação', () => {
  const car = buildOptions(routes, {}, { cars: [EV], prices: { ...PRICES, eletrico: 1 } }).find((o) => o.mode === 'car');
  assert.ok(Math.abs(car.co2 - 98.2 * 5) < 1e-9);
});

test('escolhe o elétrico quando ele é o mais barato da garagem', () => {
  const [first] = tripChoices([OLD, CITY, EV], 10, { ...PRICES, eletrico: 1 });
  assert.equal(first.car.modelo, 'DOLPHIN');
});

test('linha do Inmetro vira os campos do carro', () => {
  const f = carFieldsFromEntry({ versao: 'S10', motor: '2.8', combustivel: 'D', km_g: 10.2, co2_g: 240 });
  assert.equal(f.combustivel, 'diesel');
  assert.equal(f.km_l_diesel, 10.2);
  assert.equal(f.origem_consumo, 'inmetro');
});

test('linha do Inmetro de elétrico vira os campos do carro', () => {
  const f = carFieldsFromEntry({ versao: 'GS', motor: '', combustivel: 'V', kwh: 0.114 });
  assert.equal(f.combustivel, 'eletrico');
  assert.equal(f.kwh_km, 0.114);
});
