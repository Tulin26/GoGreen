# Foco em carona: rota diária, solicitações e desvio

Data: 2026-11-06. Estado: aprovado em conversa; este arquivo registra o desenho.

## Objetivo

O site passa a ser sobre **carona**. Cada pessoa cadastra a rota diária (onde mora, para onde vai, horários e dias) com um papel: **motorista** ("dou carona") ou **passageiro** ("preciso de carona"). O passageiro escolhe motoristas de rota parecida e envia o pedido. O motorista recebe as solicitações e decide se **compensa** mudar a rota, vendo o desvio, o mapa, o custo e o CO₂. O ônibus continua como alternativa, fora do foco.

## Decisões (do usuário)

1. Uma conta só; o papel é por rota (a mesma pessoa pode ter uma rota de motorista e outra de passageiro).
2. O passageiro escolhe o motorista e envia o pedido; o motorista só recebe pedidos de quem o escolheu.
3. O motorista vê: desvio em km e minutos, mapa com a rota original e a nova, e custo e CO₂. Não há "selo de compensa".

## Fora de escopo

Pagamento pelo app, avaliações, notificações push, limpeza do código de caronas avulsas e do chat antigo (ficam sem uso na interface; as tabelas e funções antigas permanecem no banco, sem apagar nada).

## Telas

Navegação: **Caronas** (inicial, `#/caronas`), **Rotas**, **Ônibus**.

- **Minha rota diária**: formulário (origem e destino com a busca de lugares do Google, horário de ida e volta opcional, dias, papel; para motorista, carro e vagas) e lista das minhas rotas.
- **Passageiro, "Motoristas na minha rota"**: motoristas compatíveis com o desvio de cada um e o botão "Pedir carona", com mensagem opcional.
- **Motorista, "Solicitações recebidas"**: cartão por pedido com passageiro, embarque e desembarque, desvio (km e minutos), custo extra e divisão sugerida, CO₂ evitado, botão "Ver no mapa" (rota original e nova) e Aceitar, Recusar e Conversar.
- **"Meus pedidos"** (passageiro): status e chat. Telefone e placa só depois do aceite.
- **Rotas**: continua comparando as opções, sem salvar trajeto nem dar carona. A opção de carona leva para Caronas.

## Dados (migração `007_foco_carona.sql`)

- `daily_routes` ganha `papel` ('motorista' | 'passageiro'), preenchido a partir de `oferece_carona`. `save_daily_route` deixa de criar uma carona avulsa (`offer_ride`): valida carro do usuário, telefone no perfil e vagas, e guarda a rota.
- `match_daily_rides` deixa de depender de `rides`: devolve rotas de motorista de outras pessoas com dias em comum, `vagas_livres` (vagas menos aceitos) e a rota completa (origem, destino, coordenadas, horário). Sem telefone nem placa.
- `carpool_requests` (`id`, `driver_route_id`, `passenger_route_id`, `driver_id`, `passenger_id`, `mensagem`, `status` pendente/aceita/recusada/cancelada, `created_at`, único por par de rotas). Fechada por RLS; acesso só por funções.
- Funções: `request_carpool`, `my_carpool_requests` (as dos dois papéis, com o outro lado, e telefone e placa só quando aceita), `respond_carpool_request` (só o motorista; respeita as vagas), `cancel_carpool_request` (só o passageiro).
- Chat por solicitação: `request_messages` (`request_id`, `sender_id`, `body` de 1 a 500 letras) e as funções `send_request_message` e `list_request_messages`, só para o motorista e o passageiro do pedido.

## Cálculo do desvio

Para um motorista A→B e um passageiro P (embarque) e Q (desembarque): rota base A→B contra A→P→Q→B, ambas pelo Google (`computeRoutes` com paradas intermediárias). Desvio = diferença de km e de minutos. Pré-filtro antes de chamar o Google: origem e destino do passageiro a até 3 km da rota do motorista e na ordem certa; no máximo 5 motoristas por busca.

- Custo extra do desvio = km de desvio ÷ consumo do carro × preço do combustível. Divisão sugerida = metade do combustível do trecho compartilhado mais o custo do desvio, marcada como sugestão.
- CO₂ evitado = emissão do passageiro indo sozinho menos a emissão do desvio do motorista, nunca negativo.

## Erros e estados vazios

Sem login, as telas pedem entrada. Sem Google, o desvio aparece como "não calculado" e o pedido ainda pode ser enviado. Sem carro cadastrado, o motorista é levado ao cadastro de carro. Pedido duplicado e vagas esgotadas voltam como mensagem legível.

## Testes

Banco (Postgres local): papéis, pedido, aceite com vagas, privacidade de telefone e placa, chat só dos dois, anônimo recusado. Lógica pura: desvio, custo, CO₂, pré-filtro. Store: demonstração e Supabase com os mesmos nomes (teste de contrato) e o código real do store contra o SQL real. E2E (demonstração): cadastrar rota, pedir, receber e aceitar, conversar.
