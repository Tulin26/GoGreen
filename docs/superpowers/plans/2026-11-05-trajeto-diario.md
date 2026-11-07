# Meu trajeto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma aba "Meu trajeto" onde a pessoa cadastra o trajeto diário e vê várias opções (ônibus estimado, carona, bicicleta, a pé) com o CO₂ evitado por dia, semana e mês, e onde quem tem carro oferece carona pelo mesmo trajeto.

**Architecture:** Função nova `src/features/trajeto/` com lógica pura (sem DOM) em `carbono.js`, `casar-carona.js`, `onibus-estimado.js`, `opcoes-trajeto.js`, mais a tela. Reaproveita `buildOptions` (`rotas/opcoes.js`), `getRoutes` (`servicos/caminhos.js`), `offer_ride` e o pedido/aceite de vaga já existentes. Dados novos entram no `store` (demo e Supabase, mesma interface) e na migração `005`.

**Tech Stack:** JavaScript ES modules, Vite, Leaflet, Supabase, `node --test`, PGlite (testes de banco), OSRM e OpenStreetMap (pontos de ônibus baixados no build).

**Spec:** `docs/superpowers/specs/2026-11-05-trajeto-diario-design.md`

## Global Constraints

- Coordenadas são `[lat, lng]`. Distâncias em metros, tempos em minutos, CO₂ em gramas.
- Carona casa se origem e destino ficam a até **500 m** do caminho do motorista e o horário difere até **15 min**; os dois valores vivem em `src/config/trajeto.js`.
- Referência de carbono é o **carro sozinho**, `CO2_G_PER_PKM.car` (98,2 g/passageiro.km). Mês = semana × 4,33.
- Ônibus estimado sempre com `estimated: true` e marcado na tela. Pontos de bicicleta de aluguel e motoristas de exemplo ficam em `src/config/exemplos.js`, marcados como exemplo, sem aceitar ações e fora de cálculo real.
- Camadas e regras de `docs/ARQUITETURA.md` valem: telas só falam com `store`, rede só em `servicos`/`dados`, nenhum arquivo de código acima de **220 linhas** (exceto `config`), `.view.js` só importado por `app`, `shared` não conhece features.
- `trajeto` pode depender só de `rotas`, `caronas`, `carros`, `conta`, `relatos`.
- Telefone e placa só aparecem depois da vaga aceita (nenhuma função nova os devolve).
- Textos de tela em português do Brasil, sem emojis, no tom do app.
- O projeto **não é um repositório git**: onde o padrão seria "commit", o passo é rodar `npm test` e `npm run lint` e conferir verde. Se um `git init` for feito antes de executar, commite ao fim de cada tarefa.
- Testes unitários em `tests/unit/*.test.js` com `node:test` e `node:assert/strict`, como os existentes.

## Review Focus

- Trajeto sem ponto de ônibus no raio ou com o OSRM fora do ar: a opção de ônibus cai para a estimativa por distância e continua marcada como estimada, sem quebrar a tela (Task 5).
- Origem igual ao destino, ou trajeto menor que 100 m: a tela pede outro destino, não divide por zero nem mostra CO₂ negativo (Task 2 e Task 8).
- Opção pior que o carro sozinho (por exemplo carro em modo elétrico/etanol): CO₂ evitado nunca fica negativo, fica 0 (Task 2).
- Motorista indo no sentido oposto, com origem e destino perto do caminho mas na ordem invertida, não casa (Task 3).
- Sem dias marcados ou sem horário: o cadastro é recusado com mensagem, e o motorista sem carro cadastrado não consegue oferecer carona (Task 6 e Task 8).

---

### Task 1: Parâmetros e exemplos do trajeto

**Files:**
- Create: `src/config/trajeto.js`
- Modify: `src/config/exemplos.js` (acrescentar `EXAMPLE_BIKE_STATIONS` e `EXAMPLE_DAILY_RIDES`)
- Test: `tests/unit/config-trajeto.test.js`

**Interfaces:**
- Produces: `MATCH = { maxM: 500, maxMinutes: 15 }`, `BUS_ESTIMATE = { stopBufferM: 150, maxWalkM: 800 }`, `MONTH_WEEKS = 4.33`, `BIKE_RENTAL = { kmh: 15 }`. Em `exemplos.js`: `EXAMPLE_BIKE_STATIONS: { id, nome, coords: [lat, lng], isExample: true }[]` (5 pontos: Terminal Urbano, Praça Rui Barbosa, Fatec Araçatuba, e dois no centro) e `EXAMPLE_DAILY_RIDES`, com 3 motoristas de exemplo no formato `{ id, motorista, origem, destino, from: [lat,lng], to: [lat,lng], hora: 'HH:MM', dias: number[], vagas_livres, isExample: true }` (dias 0 = domingo a 6 = sábado).

- [ ] **Step 1: Write the failing test** `config-trajeto.test.js`: `MATCH.maxM === 500`, `MATCH.maxMinutes === 15`, `MONTH_WEEKS === 4.33`; todo item de `EXAMPLE_BIKE_STATIONS` e `EXAMPLE_DAILY_RIDES` tem `isExample === true` e coordenadas com lat entre -21 e -20.9 e lng entre -50.6 e -50.3 (Araçatuba); `EXAMPLE_BIKE_STATIONS.length === 5`.
- [ ] **Step 2: Run** `node --test tests/unit/config-trajeto.test.js`. Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implement** os arquivos acima. Use os lugares reais de `src/config/lugares.js` para as coordenadas dos pontos (não invente coordenadas fora da cidade).
- [ ] **Step 4: Run** o mesmo teste. Expected: PASS.
- [ ] **Step 5: Checkpoint:** `npm test` e `npm run lint` verdes.

### Task 2: Cálculo de carbono evitado

**Files:**
- Create: `src/features/trajeto/carbono.js`
- Test: `tests/unit/carbono.test.js`

**Interfaces:**
- Consumes: `CO2_G_PER_PKM` de `src/config/transporte.js`, `MONTH_WEEKS` de `src/config/trajeto.js`.
- Produces:
  - `carpoolCo2(carKm: number, occupants: number): number` (gramas por pessoa; `occupants` mínimo 2, abaixo disso usa 2)
  - `avoidedPerTrip(optionCo2: number, carKm: number): number` (`max(0, CO2_G_PER_PKM.car * carKm - optionCo2)`)
  - `perPeriod(gramsPerTrip: number, { tripsPerDay: 1 | 2, days: number[] }): { day: number, week: number, month: number }`
  - `bestBy(options: { co2: number, minutes: number }[]): { lowestCo2: object, fastest: object }`

- [ ] **Step 1: Write the failing tests** com valores à mão: `avoidedPerTrip(0, 10) === 982`; `avoidedPerTrip(1500, 10) === 0` (nunca negativo); `carpoolCo2(10, 2) === 491` e `carpoolCo2(10, 1) === 491`; `avoidedPerTrip(carpoolCo2(10, 2), 10) === 491`; `perPeriod(100, { tripsPerDay: 2, days: [1,2,3,4,5] })` dá `{ day: 200, week: 1000, month: 4330 }`; `perPeriod(100, { tripsPerDay: 1, days: [] })` dá tudo 0; `avoidedPerTrip(0, 0) === 0`.
- [ ] **Step 2: Run** `node --test tests/unit/carbono.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** as quatro funções, puras e sem DOM.
- [ ] **Step 4: Run** o teste. Expected: PASS.
- [ ] **Step 5: Checkpoint:** `npm test` e `npm run lint` verdes.

### Task 3: Casamento de carona pelo trajeto

**Files:**
- Create: `src/features/trajeto/casar-carona.js`
- Test: `tests/unit/casar-carona.test.js`

**Interfaces:**
- Consumes: `distanceToPolyline`, `haversine` de `src/shared/mapa/geometria.js`; `MATCH` de `src/config/trajeto.js`.
- Produces:
  - `toMinutes(hora: 'HH:MM'): number`
  - `matchRide(passenger: { from: [number, number], to: [number, number], hora: string }, ride: { geometry: [number, number][], hora: string }): null | { walkToBoardM: number, walkFromAlightM: number }`
  - `sharedKm(geometry: [number, number][], boardIdx: number, alightIdx: number): number` não é exportado; `matchRide` devolve também `sharedKm: number` (trecho do caminho do motorista entre embarque e desembarque).

- [ ] **Step 1: Write the failing tests** com uma linha reta de teste (~5 km, sentido leste, vértices a cada 500 m): origem e destino a 300 m da linha e na ordem certa casam e devolvem `walkToBoardM` perto de 300; origem a 600 m da linha não casa; origem e destino na ordem invertida (embarca depois de desembarcar) não casa; horário 14 min depois casa, 16 min depois não casa; `ride.geometry` vazio ou com 1 ponto devolve `null`; `toMinutes('07:30') === 450`.
- [ ] **Step 2: Run** `node --test tests/unit/casar-carona.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** Ache o vértice mais próximo de origem e de destino na geometria do motorista; exija índice de embarque menor que o de desembarque; exija distâncias até a polilinha dentro de `MATCH.maxM`; exija `|toMinutes(a) - toMinutes(b)| <= MATCH.maxMinutes`.
- [ ] **Step 4: Run** o teste. Expected: PASS.
- [ ] **Step 5: Checkpoint:** `npm test` e `npm run lint` verdes.

### Task 4: Pontos de ônibus do OSM no build

**Files:**
- Create: `scripts/baixar-pontos.mjs`, `src/servicos/pontos-onibus.js`, `public/dados/pontos-onibus.json` (gerado; versionar um arquivo inicial de fallback)
- Modify: `package.json` (script `build`: `node scripts/baixar-consumo.mjs && node scripts/baixar-pontos.mjs && vite build`)
- Test: `tests/unit/pontos-onibus.test.js`

**Interfaces:**
- Consumes: `fetchDoSite` de `src/servicos/site.js` (para ler `/dados/pontos-onibus.json`).
- Produces: `parseOverpass(json: object): { id: number, coords: [number, number], nome: string | null }[]` (exportado de `src/servicos/pontos-onibus.js`; o script do build importa dele); `loadBusStops(): Promise<{ id, coords, nome }[]>` (devolve `[]` se o arquivo falhar).

- [ ] **Step 1: Write the failing test:** `parseOverpass` com um JSON de exemplo de 3 `node` (um sem `name`, um com `lat`/`lon` faltando que deve ser descartado) devolve 2 pontos com `coords` em `[lat, lng]` e `nome` `null` quando faltar; `loadBusStops` com `fetchImpl` que falha devolve `[]`.
- [ ] **Step 2: Run** `node --test tests/unit/pontos-onibus.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `parseOverpass`/`loadBusStops` (injeção de `fetchImpl` como em `getRoutes`) e o script, que consulta a Overpass por `highway=bus_stop` na área administrativa de Araçatuba, grava `public/dados/pontos-onibus.json`, e, se a consulta falhar, **mantém o arquivo anterior e sai com código 0** (o build não pode quebrar, como já ocorre com o Inmetro). Rode o script uma vez para gerar o arquivo inicial; se a Overpass estiver fora do ar, gere o arquivo com `[]` e avise na resposta.
- [ ] **Step 4: Run** o teste e `node scripts/baixar-pontos.mjs`. Expected: PASS e arquivo gravado.
- [ ] **Step 5: Checkpoint:** `npm test`, `npm run lint` e `npm run build:app` verdes.

### Task 5: Ônibus estimado pelas avenidas e pelos pontos

**Files:**
- Create: `src/features/trajeto/onibus-estimado.js`
- Modify: `src/servicos/caminhos.js` (`getRoutes` aceita `{ alternatives: true }` também para `car`; padrão mantido)
- Test: `tests/unit/onibus-estimado.test.js`, e um caso novo em `tests/unit/caminhos.test.js`

**Interfaces:**
- Consumes: `distanceToPolyline`, `haversine`, `polylineLength` de `geometria.js`; `busMinutes` de `src/features/rotas/recomendacao.js`; `BUS_ESTIMATE` de `config/trajeto.js`; `co2For` de `recomendacao.js`.
- Produces: `planBus(from, to, stops, candidates): { geometry, km, minutes, co2, board: stop | null, alight: stop | null, stopsPassed: stop[], estimated: true }` onde `candidates` são alternativas de caminho de carro `{ km, minutes, geometry }[]`. Escolhe a alternativa que passa por mais pontos dentro de `BUS_ESTIMATE.stopBufferM`; embarque é o ponto mais próximo da origem e desembarque o mais próximo do destino, ambos dentro de `BUS_ESTIMATE.maxWalkM`, na ordem ao longo do caminho; sem ponto utilizável devolve `board: null, alight: null, stopsPassed: []` mas mantém `estimated: true` e usa o caminho de menor distância.

- [ ] **Step 1: Write the failing tests:** com 2 candidatos, o que passa por 4 pontos vence o que passa por 1; `stopsPassed` vem na ordem do caminho; `stops: []` devolve `board === null` e `estimated === true` sem lançar; ponto de embarque a 900 m da origem é ignorado (`maxWalkM` 800); `minutes === busMinutes(km)`. Em `caminhos.test.js`: `buildRouteUrl('car', a, b, true)` contém `alternatives=true`.
- [ ] **Step 2: Run** os dois arquivos de teste. Expected: FAIL.
- [ ] **Step 3: Implement** `planBus` puro e a opção `alternatives` em `getRoutes` (sem mudar o comportamento atual quando ela não é passada).
- [ ] **Step 4: Run** os testes. Expected: PASS.
- [ ] **Step 5: Checkpoint:** `npm test` e `npm run lint` verdes.

### Task 6: Banco: tabela, funções e store (demo e Supabase)

**Files:**
- Create: `supabase/migrations/005_trajetos.sql`, `src/dados/demo/trajetos.js`, `src/dados/supabase/trajetos.js`
- Modify: `src/dados/demo/index.js`, `src/dados/supabase/index.js` (espalhar `trajetosDemo`/`trajetosSupabase`), `src/dados/demo/estado.js` (campo `dailyRoutes: []`)
- Test: `tests/unit/contrato-dados.test.js` (já compara as duas interfaces), `tests/database/politicas.test.js` (casos novos)

**Interfaces:**
- Produces (no `store`, mesmas assinaturas nas duas versões):
  - `saveDailyRoute({ origem, destino, from, to, ida_hora, volta_hora, dias, oferece_carona, car_id, vagas }): Promise<string>` (id)
  - `listDailyRoutes(): Promise<DailyRoute[]>` (só as da própria pessoa)
  - `deleteDailyRoute(id: string): Promise<void>`
  - `matchDailyRides({ dias: number[] }): Promise<{ id, motorista, origem, destino, from, to, hora, dias, vagas_livres, ride_id }[]>` (sem telefone nem placa)
- SQL: tabela `public.daily_routes` (colunas do spec; checks: `origem`/`destino` 2 a 80 caracteres, `ida_hora` e `volta_hora` no formato `HH:MM`, `dias` não vazio com valores 0 a 6, `vagas` 1 a 6 quando `oferece_carona`), RLS ligada, `revoke all from anon, authenticated`, e funções `save_daily_route`, `my_daily_routes`, `delete_daily_route`, `match_daily_rides` com `security definer set search_path = ''`, no padrão de `offer_ride` em `002_carros_e_caronas.sql`. `save_daily_route` com `oferece_carona` exige carro do próprio usuário (`car_id`) e cria a oferta pelo mesmo caminho de `offer_ride`.

- [ ] **Step 1: Write the failing tests:** em `politicas.test.js`, como o teste existente faz com `rides`: usuário B não vê o trajeto do usuário A (`my_daily_routes` devolve só o próprio), `anon` não lê `daily_routes` diretamente, `match_daily_rides` não devolve colunas de telefone/placa, salvar com `dias = '{}'` é recusado, `oferece_carona` sem carro é recusado, e outra pessoa não apaga o trajeto alheio. `contrato-dados.test.js` passa a falhar sozinho quando só uma das duas versões tem as funções novas.
- [ ] **Step 2: Run** `node --test tests/database/politicas.test.js tests/unit/contrato-dados.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** a migração, as duas versões do store e o registro. Na versão demo, `matchDailyRides` devolve só `EXAMPLE_DAILY_RIDES` (não há outras pessoas no navegador), todos com `isExample: true`.
- [ ] **Step 4: Run** os mesmos testes. Expected: PASS.
- [ ] **Step 5: Checkpoint:** `npm test` e `npm run lint` verdes. Atualizar o passo do README que lista as migrações (`001` a `005`).

### Task 7: Montagem das opções do trajeto

**Files:**
- Create: `src/features/trajeto/opcoes-trajeto.js`
- Test: `tests/unit/opcoes-trajeto.test.js`

**Interfaces:**
- Consumes: `buildOptions(routes, reports, p, { cars, prices, now })` de `rotas/opcoes.js`; `planBus` (Task 5); `matchRide` (Task 3); `avoidedPerTrip`, `carpoolCo2`, `perPeriod`, `bestBy` (Task 2); `EXAMPLE_BIKE_STATIONS`, `BIKE_RENTAL` (Task 1).
- Produces: `buildDailyOptions({ routes, busCandidates, stops, rides, rideGeometries, reports, prefs, cars, prices, trip: { from, to, hora, dias, tripsPerDay } }): { options: DailyOption[], best: { lowestCo2, fastest } }` onde `DailyOption = { mode: 'foot'|'bike'|'bikeRental'|'bus'|'carpool'|'car', minutes, km, co2, avoided: { day, week, month }, estimated: boolean, isExample: boolean, detail: object }`. `carpool` só aparece com pelo menos uma carona casada; `bikeRental` só com ponto de exemplo a até 800 m da origem **e** outro a até 800 m do destino, sempre com `isExample: true`; `car` entra como referência com `avoided` zerado.

- [ ] **Step 1: Write the failing tests** com caminhos de teste construídos à mão: lista contém `foot`, `bike`, `bus`, `car` por padrão; `carpool` aparece com carona casada e some sem; `bikeRental` tem `isExample === true`; `bus.estimated === true`; `avoided.day` da opção `foot` num trajeto de 10 km com `tripsPerDay: 2` é `1964` (982 × 2); origem igual a destino (`from` e `to` iguais) devolve `options: []` sem lançar; `best.lowestCo2.co2 <= todas as outras`.
- [ ] **Step 2: Run** `node --test tests/unit/opcoes-trajeto.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `buildDailyOptions`. Para carona, `occupants` é 2 (motorista mais este passageiro) e `km` é `sharedKm` de `matchRide` mais a caminhada somada ao tempo.
- [ ] **Step 4: Run** o teste. Expected: PASS.
- [ ] **Step 5: Checkpoint:** `npm test` e `npm run lint` verdes.

### Task 8: Tela "Meu trajeto" e rota do app

**Files:**
- Create: `src/features/trajeto/trajeto.view.js`, `src/features/trajeto/templates.js`, `src/styles/componentes/trajeto.css`
- Modify: `src/app/rotas-do-app.js` (rota `trajeto`), `src/app/rotas-do-app.js` `NAV` (item "Trajeto", ícone existente `rota`), `src/styles/index.css` (importar `trajeto.css`), `tests/unit/arquitetura.test.js` (`trajeto: ['rotas', 'caronas', 'carros', 'conta', 'relatos']` em `FEATURES`), `docs/ARQUITETURA.md` (tabelas de "Quem pode usar quem" e pastas), `README.md` (funções e roteiro)
- Test: `tests/unit/arquitetura.test.js` (existente) e `tests/e2e/run.cjs` (roteiro novo)

**Interfaces:**
- Consumes: `store.saveDailyRoute/listDailyRoutes/deleteDailyRoute/matchDailyRides`, `getRoutes`, `loadBusStops`, `buildDailyOptions`, campos de endereço de `rotas/busca.js` (`createBusca`), `requireLogin` de `conta/login.js`, `session`, `renderMapa`-style de `rotas/mapa-lateral.js` para o mapa.
- Produces: `renderTrajeto(el: HTMLElement): void`, registrado em `ROUTES.trajeto = { view: renderTrajeto, nav: 'trajeto', title: 'Meu trajeto' }`.

- [ ] **Step 1: Write the failing tests:** `arquitetura.test.js` falha sem a entrada `trajeto` em `FEATURES`; no E2E, o roteiro novo abre `#/trajeto`, preenche Terminal Urbano e Praça Rui Barbosa com horário e dias, e espera ver cartões de a pé, bicicleta de aluguel marcada "exemplo", ônibus marcado "estimado", e o CO₂ evitado por semana.
- [ ] **Step 2: Run** `node --test tests/unit/arquitetura.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** a tela seguindo os 3 passos do spec (cadastrar, opções lado a lado, impacto com a melhor por emissão e por tempo). Validações: origem igual a destino pede outro destino; sem dias ou horário bloqueia o envio com mensagem; sem login, simular é livre e salvar chama `requireLogin`. Estados do spec: sem carona compatível mostra "ninguém no seu trajeto ainda" com convite a oferecer; serviço fora do ar mostra a estimativa marcada. Cada arquivo abaixo de 220 linhas (separe formulário e cartões em `templates.js`).
- [ ] **Step 4: Run** `npm test` e `npm run test:e2e`. Expected: PASS (o E2E precisa do Playwright; se não estiver instalado, rode a verificação manual abaixo e diga isso).
- [ ] **Step 5: Verificar no navegador:** `npm run dev`, abrir `#/trajeto`, comparar com o roteiro e conferir mobile e desktop.

### Task 9: "Dou carona" pelo trajeto

**Files:**
- Modify: `src/features/trajeto/trajeto.view.js`, `src/features/trajeto/templates.js` (bloco "Dou carona")
- Test: `tests/e2e/run.cjs` (passo novo), `tests/unit/opcoes-trajeto.test.js` (caso de motorista)

**Interfaces:**
- Consumes: `store.saveDailyRoute` com `oferece_carona: true`, `store.listCars` e `openCarForm` de `features/carros/` para quem não tem carro, `requireLogin`.
- Produces: bloco na tela de trajeto com seletor de carro, vagas (1 a 6) e botão "Oferecer carona neste trajeto"; depois de salvo, o trajeto aparece como oferta em Caronas (`listRides`) e os pedidos entram pelo fluxo existente.

- [ ] **Step 1: Write the failing test:** no E2E, cadastrar trajeto com `oferece_carona` e conferir que a oferta aparece em `#/caronas` e que o pedido de exemplo pode ser aceito, com telefone e placa só depois do aceite. Unitário: motorista sem carro cadastrado recebe a mensagem para cadastrar um carro e nada é salvo.
- [ ] **Step 2: Run** o teste novo. Expected: FAIL.
- [ ] **Step 3: Implement** o bloco, reaproveitando seletor e regras de vaga de `src/features/caronas/`.
- [ ] **Step 4: Run** `npm run test:tudo`. Expected: PASS (e2e conforme a ressalva da Task 8).
- [ ] **Step 5: Verificar no navegador** o roteiro completo: cadastrar trajeto, ver opções, oferecer carona, aceitar pedido de exemplo, abrir o Painel.
