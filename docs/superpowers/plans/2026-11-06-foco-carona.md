# Foco em carona: plano de implementação

> Execução nativa (uma sessão), tarefa por tarefa, teste primeiro. Sem git: o ponto de controle de cada tarefa é `npm test` e `npm run lint` verdes.

**Spec:** `docs/superpowers/specs/2026-11-06-foco-carona-design.md`

## Restrições globais

- Camadas e regras de `docs/ARQUITETURA.md`; arquivos de código até 220 linhas.
- `rotas` deixa de depender de `caronas`; `caronas` passa a depender de `rotas` (campo de busca de lugares): `FEATURES` do teste de arquitetura muda para `rotas: ['carros','conta']`, `caronas: ['carros','conta','rotas']`.
- Telefone e placa só depois do aceite. Nada de pagamento.
- O banco não recebe nenhuma operação destrutiva: só migração nova.

## Tarefas

1. **Banco**: `007_foco_carona.sql` e testes em `tests/database/politicas.test.js` (papel, pedido, aceite e vagas, privacidade, chat por solicitação, anônimo recusado).
2. **Lógica pura**: `src/features/caronas/desvio.js` (desvio, custo, divisão, CO₂, pré-filtro) e `src/servicos/desvio.js` (Google, rota base e rota com paradas), com testes e o Google simulado.
3. **Store**: funções novas em `src/dados/supabase/` e `src/dados/demo/` (rota diária com papel, candidatos, pedidos, resposta, mensagens por solicitação), contrato igual, e teste do código real do store contra o SQL.
4. **Tela Caronas**: `caronas.view.js` reescrita com rota diária, motoristas na minha rota, solicitações recebidas, meus pedidos e chat por solicitação; mapa das duas rotas.
5. **Navegação e Rotas**: Caronas como inicial, Rotas sem salvar nem dar carona, opção de carona levando a Caronas.
6. **Documentação e e2e**: README, arquitetura, e2e do fluxo completo na demonstração.

## Revisão

Ao fim, rodar `npm run test:tudo` e conferir no navegador com o Google real: cadastrar uma rota de motorista e uma de passageiro, pedir, aceitar e conversar.
