# Arquitetura do GoGreen

O projeto é separado por **partes do produto** e por **camadas**. Para mexer no ônibus, por exemplo, quase tudo está em `src/features/onibus/`.

## Camadas

```
                app            liga telas, moldura e navegação
                 |
             features          uma pasta por função: telas e regras
              /  |  \
         dados servicos shared
             \    |    /
               config          valores e dados fixos
```

Cada camada só conhece as de baixo. Os testes em `tests/unit/arquitetura.test.js` falham se alguém quebrar isso.

| Parte | Pasta | Responsabilidade | Pode usar |
| --- | --- | --- | --- |
| Inicialização | `src/app/` | Moldura da tela, navegação e lista de telas | tudo |
| Funções do produto | `src/features/` | Telas e regras, uma pasta por função | `dados`, `servicos`, `shared`, `config` e as funções previstas |
| Banco de dados | `src/dados/` | servidor (api/ + Neon) ou modo demonstração, com a mesma interface | `config` |
| Serviços externos | `src/servicos/` | Endereços, caminhos, preços e consumo | `shared`, `config` |
| Peças comuns | `src/shared/` | Mapa, avisos, diálogos, ícones, formatação e estado da sessão | `config` |
| Parâmetros | `src/config/` | Valores do cálculo, linhas de ônibus e lugares | nada |
| Aparência | `src/styles/` | Variáveis de cor e tipografia, e um CSS por componente | |

Fora de `src/`:

| Pasta | Responsabilidade |
| --- | --- |
| `api/` | Função da Vercel que lê o preço dos combustíveis na ANP |
| `scripts/` | Gera a lista de consumo a partir dos PDFs do Inmetro, durante o build |
| `banco/` | Base do Neon e `migracoes/`: tabelas, regras de segurança e funções, em ordem |
| `api/` | Funções da Vercel: `auth.js` (conta e sessão) e `db.js` (operações no banco); o código fica em `api/_lib/` |
| `tests/` | `unit` (regras e arquitetura), `database` (segurança) e `e2e` (telas) |
| `docs/` | Esta página, especificação e mockup da interface |

## Quem pode usar quem entre as funções

| Função | Pode usar |
| --- | --- |
| `carros` | nenhuma |
| `conta` | `carros` |
| `onibus` | `conta` |
| `perfil` | `carros`, `conta` |
| `caronas` | `carros`, `conta` |
| `rotas` | `carros`, `caronas`, `conta` |

Se uma função nova precisar de outra, ela entra nesta tabela e em `FEATURES`, no teste de arquitetura. Se duas funções precisarem do mesmo dado fixo, ele vai para `config`.

## As funções em `src/features/`

```
rotas/      Comparar rotas
  rotas.view.js        coordena a comparação
  busca.js             campos de origem e destino, sugestões e GPS
  recomendacao.js      nota, alertas e explicação: o coração do projeto
  opcoes.js            monta as quatro opções de transporte
  preferencias.js      junta o que foi marcado na tela e o perfil
  lugares.js           procura nos nomes populares
  cartoes.js           cartões de resultado
  templates.js         HTML da tela e do resultado
  sugestoes.js         listas de escolha da busca
  mapa-lateral.js      mapa fixo em tela larga, diálogo no celular
  mapa-rota.js         desenha o caminho no mapa
  como-calculamos.js   explicação do cálculo e fontes
  extras-panel.js      "Mais jeitos de ir": escolher uma opção, rota por trechos, chat e salvar trajeto
  extras.js            carrega pontos de ônibus e motoristas e monta as opções extras
  opcoes-trajeto.js    ônibus pelos pontos, bicicleta de aluguel e carona, com horário e CO2 evitado
  guia.js              acompanha a posição: trecho atual, distância, saída do traçado e chegada
  guia-ui.js           barra "Iniciar rota" com o GPS em tempo real
  pernas.js            divide a opção escolhida em trechos (a pé até a bicicleta, depois pedalando...)
  onibus-estimado.js   caminho de ônibus estimado pelos pontos do OpenStreetMap
  casar-carona.js      casa passageiro e motorista pelo trajeto
  carbono.js           CO2 evitado por dia, semana e mês
  rotina.js            horário, dias da semana, dar carona e trajetos salvos

onibus/     Ônibus ao vivo e estimado
  onibus.view.js       tela e atualização periódica
  previsao.js          decide entre posição ao vivo e horário (com estimativa)
  estimativa.js        onde os ônibus estão e quando passam por um ponto, pelo horário e pelo trajeto estimado
  estimativa-ui.js     régua visual, previsão no ponto da pessoa e lista de pontos
  informar.js          envio do GPS de quem está no ônibus
  horarios.js          próximas saídas
  mapa-onibus.js       desenha os ônibus no mapa
  templates.js         HTML da tela

carros/     Carros de cada pessoa
  economia.js          gasto por carro e combustível
  catalogo.js          lista do Inmetro e validação da placa
  campos-carro.js      campos do carro, usados no cadastro e no perfil
  precos.js            frase que diz de quando é o preço
  formulario.js        adicionar carro pelo perfil

caronas/    Aba Pedidos: rota diária e pedidos de carona
  caronas.view.js      tela
  rota-diaria.js       cadastrar a rota diária (motorista ou passageiro)
  solicitacoes.js      pedidos recebidos (desvio, aceitar, recusar) e meus pedidos
  chat.js              conversa de cada pedido
  dialogos.js          termos antes de aceitar
  regras.js            link do WhatsApp

perfil/     Conta, veículos, privacidade e apagar a conta (apagar-conta.js)
conta/      Login e cadastro
```

## Dados e serviços

```
src/dados/
  index.js        escolhe servidor ou demonstração
  demo/           conta, onibus, carros, caronas, trajetos e chat, no navegador
  remoto/        os mesmos assuntos, falando com api/db e api/auth

src/servicos/
  enderecos.js    busca de lugares (Google Places)
  caminhos.js     caminhos pelas ruas do OpenStreetMap (OSRM), com estimativa em linha reta se o serviço cair
  combustiveis.js preço da ANP, com último valor salvo se falhar
  consumo.js      lista de consumo gerada no build
  pontos-onibus.js pontos de ônibus do OpenStreetMap, baixados no build
  linha-estimada.js trajeto estimado de cada linha (Terminal até o bairro, pelo Google)
  enderecos-locais.js ruas e números de casa do IBGE (CNEFE), baixados no build, com busca local
  site.js         busca dados do próprio site
```

## Exemplos

Enquanto o banco está vazio, Caronas mostra os exemplos de `src/config/exemplos.js`, sempre marcados. Eles não aceitam ações e não entram na comparação de rotas. Rotas e Ônibus têm um botão de exemplo. Quando o primeiro dado de verdade chega, os exemplos daquela aba somem.

## Regras que os testes vigiam

1. **Telas não falam com o banco direto.** Elas chamam `store`, de `src/dados/index.js`. Sem `VITE_USAR_BANCO=1`, o `store` usa o modo demonstração.
2. **Demonstração e servidor têm as mesmas funções.** `tests/unit/contrato-dados.test.js` compara as duas.
3. **Chamada de rede fica em `servicos` ou `dados`.** Assim, trocar um serviço externo não mexe nas telas.
4. **`shared` não conhece as funções nem o banco.**
5. **Regra de negócio não mexe na tela.** `recomendacao.js`, `horarios.js`, `economia.js` e `resumo.js` rodam sem navegador.
6. **Tela é só para `app`.** Nenhuma função importa o `.view.js` de outra.
7. **Nenhum arquivo de código passa de 220 linhas.** Só `config` fica de fora, porque guarda dados.

A segurança fica no servidor e no banco, porque o navegador é público: o login usa senha em scrypt e cookie HttpOnly assinado; cada chamada roda numa transação com o papel `authenticated` ou `anon`, então as regras de linha (RLS) das migrações valem. `tests/database/politicas.test.js` testa as regras e `tests/database/servidor.test.js` testa o servidor inteiro.

## Serviços externos

| Serviço | Uso | Se cair |
| --- | --- | --- |
| Neon (Postgres) | Contas, carros, caronas, trajetos, chat e posições dos ônibus | Telas mostram erro; rotas seguem sem as caronas |
| Google Maps Platform | Mapa, busca de lugares e rotas (a pé, bike e carro) | O mapa mostra aviso; as rotas viram estimativa em linha reta, marcada na tela |
| OpenStreetMap (Overpass) | Pontos de ônibus, baixados no build (scripts/baixar-pontos.mjs) | Mantém o último arquivo; o ônibus cai para a estimativa por distância |
| Inmetro (PBE Veicular) | Consumo dos carros, lido dos PDFs no build | A pessoa informa o consumo à mão |
| ANP (pesquisa semanal) | Preço dos combustíveis em Araçatuba, com cache de 6 horas | Usa o último preço salvo, marcado na tela |
| Vercel | Hospedagem | Site fora do ar |

## Onde mexer

| Quero... | Arquivo |
| --- | --- |
| Corrigir a tarifa ou o CO₂ | `src/config/transporte.js` |
| Mudar a regra da recomendação | `src/features/rotas/recomendacao.js` |
| Mudar os exemplos das abas (inclui bicicleta de aluguel e motoristas do trajeto) | `src/config/exemplos.js` |
| Ajustar a carona do trajeto (500 m, 15 min) | `src/config/trajeto.js` |
| Atualizar horários | `src/config/linhas-onibus.js` |
| Adicionar um lugar popular | `src/config/lugares.js` |
| Trocar um serviço externo | `src/servicos/` |
| Mudar uma consulta ao banco | `src/dados/remoto/`, `api/_lib/operacoes.js` e `src/dados/demo/`, no arquivo do assunto |
| Criar uma tela | Pasta em `src/features/` e uma linha em `src/app/rotas-do-app.js` |
| Mudar uma cor | `src/styles/tokens.css` |
