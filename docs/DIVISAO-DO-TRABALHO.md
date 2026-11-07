# Divisão do trabalho

O projeto foi dividido em 6 partes. Cada parte tem arquivos próprios: nenhum arquivo pertence a duas partes, então os envios ao GitHub não geram conflito entre si.

| Parte | Área | O que contém | Responsável |
|---|---|---|---|
| 1 | Base, configuração e documentação | Configuração do projeto (`package.json`, Vite, ESLint, Vercel), CI no GitHub, `src/config/` (cidade, lugares, linhas, exemplos), documentação e sistema de design | |
| 2 | Banco de dados e dados externos | `banco/` (base do Neon e migrações SQL), `scripts/` (migrar, cadastrar exemplos, baixar dados do IBGE, OpenStreetMap, Inmetro e ANP) e testes das regras do banco | |
| 3 | API (servidor) e camada de dados | `api/` (login, sessão e acesso ao banco, funções da Vercel), `src/dados/` (modo demonstração e cliente do servidor) e testes do servidor | |
| 4 | Front-end: tela Rotas | `src/features/rotas/`: busca, resultado, caronas que passam perto, passo a passo, histórico de lugares, comparação de modos | |
| 5 | Front-end: mapa, serviços e Ônibus | `src/shared/mapa/` (Google com reserva OpenStreetMap), `src/servicos/` (rotas, endereços, dados externos) e `src/features/onibus/` | |
| 6 | Front-end: Caronas, conta, perfil, interface e estilos | `src/features/caronas`, `carros`, `conta`, `perfil`, a casca do app (`src/app/`), componentes compartilhados (`src/shared/`) e `src/styles/` | |

## Como cada pessoa envia a sua parte

1. Clonar o repositório e criar uma branch própria (`parte-N-nome`).
2. Copiar os arquivos da sua parte (pacote `.zip` da parte) para dentro da pasta do repositório.
3. Apagar os arquivos antigos da sua parte que não existem mais (lista no guia de comandos).
4. `git add` somente dos caminhos da sua parte, `git commit` e `git push`.
5. Abrir um Pull Request para `main`.

A ordem de envio não importa, porque as partes não se sobrepõem. Só depois que as 6 estiverem na `main` o projeto roda completo (`npm install`, `npm test`, `npm run dev`).

## Regras

- Nunca enviar `.env` nem `.env.local`: têm chaves e senha do banco. O `.gitignore` já protege, mas confira o `git status` antes de commitar.
- Cada pessoa commita com o próprio nome e e-mail do GitHub.
- Mensagens de commit no formato `tipo(área): o que mudou`, por exemplo `feat(rotas): histórico de lugares`.
