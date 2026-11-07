# Meu trajeto: rota diária com várias opções e carbono evitado

Data: 2026-11-05. Estado: aguardando revisão.

## Objetivo

Hoje o GoGreen responde uma consulta avulsa ("como ir de A para B agora"). A pessoa passa a cadastrar o **trajeto que faz todo dia** e recebe, para esse mesmo caminho, várias opções (ônibus, carona, bicicleta, a pé), cada uma com o **CO₂ evitado** em relação a ir de carro sozinho. Quem tem carro usa o mesmo trajeto para **oferecer carona**, e o sistema casa passageiros com motoristas pelo trajeto.

Sucesso: dado um trajeto cadastrado, a tela mostra pelo menos as opções de ônibus estimado, carona (se houver motorista compatível), bicicleta e a pé, com CO₂ por dia, semana e mês, e a melhor opção por emissão e por tempo.

## Decisões já tomadas com o usuário

1. **Ônibus em duas fases.** Fase 1 (este spec): trajeto *estimado*, traçado pelas avenidas principais passando pelo máximo de pontos de ônibus do OpenStreetMap, sempre marcado como "estimado". Fase 2 (fora deste spec): cadastrar quais linhas da TUA passam em cada ponto, para recomendar uma linha real.
2. **Bicicleta.** Bicicleta própria (`hasBike` do perfil) mais **pontos de aluguel fictícios**, cadastrados como exemplo e sempre marcados como exemplo.
3. **Carona casada pelo trajeto.** O motorista cadastra o trajeto diário. O passageiro casa se origem e destino ficam a até 500 m do caminho do motorista e o horário bate com folga de 15 min. Ambos os valores são parâmetros em `config`.
4. **Abordagem A.** Função nova `src/features/trajeto/`, reaproveitando `rotas`, `caronas`, `carros` e `conta`.
5. **Pontos do OSM baixados no build**, não consultados a cada busca (a Overpass é instável).

## Fora de escopo

Cadastro de linhas por ponto (fase 2), itinerário real da TUA, pagamento, avisos push, reenvio offline, bicicleta compartilhada real.

## Arquitetura

Nova função `trajeto` em `src/features/trajeto/`. Dependências permitidas, a registrar em `FEATURES` no `tests/unit/arquitetura.test.js` e em `docs/ARQUITETURA.md`: `rotas`, `caronas`, `carros`, `conta`, `relatos`. Nenhuma outra função passa a depender de `trajeto`. Regras mantidas: telas só falam com `store`, rede só em `servicos`/`dados`, nenhum arquivo de código acima de 220 linhas, `.view.js` só importado por `app`.

```
src/features/trajeto/
  trajeto.view.js     tela: cadastro, opções e impacto
  templates.js        HTML do formulário e dos cartões
  opcoes-trajeto.js   monta as opções do trajeto (sem DOM)
  carbono.js          CO2 evitado por dia, semana e mês (sem DOM)
  casar-carona.js     casa passageiro e motorista (sem DOM)
  onibus-estimado.js  escolhe embarque e desembarque e monta o caminho (sem DOM)
src/servicos/pontos-onibus.js   lê os pontos baixados no build
scripts/baixar-pontos.mjs       baixa os pontos do OSM no build
```

A rota `#/trajeto` entra em `src/app/rotas-do-app.js` e na navegação.

## Dados

**Migração `supabase/migrations/005_trajetos.sql`**, com RLS igual à das demais tabelas (acesso só por funções `security definer`, `revoke all` para `anon` e `authenticated`):

- `daily_routes`: `id`, `user_id`, origem e destino (texto e coordenadas), `ida_hora`, `volta_hora` (opcional), `dias` (dias da semana), `oferece_carona` (booleano), `car_id` e `vagas` (quando oferece), `status`, `created_at`. Cada pessoa vê e altera só os próprios trajetos.
- Funções: `save_daily_route`, `my_daily_routes`, `delete_daily_route`, e `match_daily_rides` (devolve motoristas compatíveis **sem telefone nem placa**).
- A oferta de carona do trajeto cria ou atualiza uma linha em `rides` pelo `offer_ride` existente, para reaproveitar o pedido e o aceite de vaga (`request_ride`, `respond_request`). Telefone e placa continuam só depois do aceite.

**Store** (`src/dados`): funções novas `saveDailyRoute`, `listDailyRoutes`, `deleteDailyRoute`, `matchDailyRides`, em `demo/` e em `supabase/`. O `tests/unit/contrato-dados.test.js` exige que as duas versões tenham as mesmas funções. O teste `tests/database/politicas.test.js` ganha casos para `daily_routes`: outra pessoa não lê, não altera e não vê telefone.

**Exemplos** em `src/config/exemplos.js`: pontos de aluguel de bicicleta fictícios (em torno de 5, no centro, no terminal e perto da Fatec) e motoristas de exemplo para o casamento, todos marcados como exemplo e sem aceitar ações.

## Lógica

**Ônibus estimado** (`onibus-estimado.js`): dado o par origem/destino, escolhe o ponto de embarque mais próximo da origem e o de desembarque mais próximo do destino, dentro de `MAX_MINUTES` de caminhada. O caminho entre os dois vem do OSRM, que já prefere vias maiores, e é puxado para passar por pontos de ônibus próximos do traçado (distância máxima em `config`, no estilo de `ROUTE_BUFFER_M`). Devolve geometria, pontos por onde passa, minutos (usando `busMinutes` de `rotas/recomendacao.js`) e um sinal `estimado: true`. Sem pontos suficientes ou com o OSRM fora do ar, cai para a estimativa pela distância que o app já usa, marcada na tela.

**Carona** (`casar-carona.js`): para cada motorista, o caminho vem do OSRM. O passageiro casa se origem e destino ficam a até 500 m desse caminho, na ordem certa (embarca antes de desembarcar), e o horário difere até 15 min. Usa `distanceToPolyline` de `shared/mapa/geometria.js`. Devolve a distância de caminhada até o embarque ("pega você a 300 m de casa").

**Opções** (`opcoes-trajeto.js`): chama `buildOptions` de `rotas/opcoes.js` para a pé, bicicleta e carro, troca a opção de ônibus pela estimada e acrescenta a de carona e a de bicicleta de aluguel (caminhar até o ponto fictício e pedalar). Reaproveita relatos, alertas e preferências como a consulta avulsa.

**Carbono** (`carbono.js`): referência é o carro sozinho, com `CO2_G_PER_PKM.car`. Para cada opção, evitado = (CO₂ do carro sozinho − CO₂ da opção) × viagens. Na carona, o carro emite o mesmo total e é dividido pelos ocupantes; o passageiro evita a parte que não gera viagem nova. Dia = viagens do dia (ida e volta se houver), semana = dias marcados, mês = semana × 4,33. Etanol e elétrico seguem a regra já existente em `buildOptions` (mantêm o valor de referência).

## Erros e estados vazios

- Sem login: dá para simular um trajeto; salvar e oferecer carona pedem login (`requireLogin`).
- Sem motorista compatível: a opção de carona não aparece, com a frase "ninguém no seu trajeto ainda" e o convite para oferecer.
- Serviços externos fora do ar: a pé e carro seguem pela estimativa, marcada na tela.
- Exemplos nunca aceitam ação e não entram em cálculo real.

## Testes

- `carbono.test.js`: casos com valores à mão (a pé = referência inteira evitada, ônibus, carona com 2 ocupantes, semana e mês).
- `casar-carona.test.js`: dentro e fora dos 500 m, ordem de embarque, folga de horário, motorista de outra direção.
- `onibus-estimado.test.js`: escolha de pontos, caminho passando por pontos, queda para estimativa sem pontos.
- `contrato-dados.test.js` e `tests/database/politicas.test.js` estendidos como descrito.
- `arquitetura.test.js` atualizado com a nova função.
- E2E do roteiro: cadastrar trajeto, ver opções com carbono, oferecer carona.

## Riscos

- O trajeto de ônibus é uma **estimativa**, não o itinerário da TUA. A tela precisa deixar isso claro, e a fase 2 corrige.
- Só 88 pontos de ônibus no OSM: a cobertura pode ser irregular e a estimativa cair para a distância em bairros sem ponto.
- Pontos de bicicleta e motoristas de exemplo são fictícios, e o texto da tela precisa dizer isso.
- OSRM e Nominatim públicos têm limite de 1 requisição por segundo. O casamento de carona calcula o caminho de cada motorista, então precisa de cache por trajeto para não estourar o limite.
