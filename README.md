# GoGreen

Site responsivo que responde **"Qual é o melhor jeito de chegar lá hoje?"** em Araçatuba-SP, usando informações dos próprios moradores. Projeto da Fatec Araçatuba sobre Mobilidade Urbana e Sustentabilidade.

## O que ele faz

| Função | Como funciona |
| --- | --- |
| Comparar rotas | Compara a pé, bike, ônibus e carro por tempo, custo e CO₂, com rotas do OpenStreetMap, e busca de lugares e mapa do Google |
| Estimativa dos ônibus | Sem posição ao vivo, a aba Ônibus estima onde cada ônibus está: usa o horário cadastrado das saídas e um trajeto estimado (caminho de carro do Terminal até o bairro da linha, pelo Google) a 20 km/h. Mostra uma régua do Terminal ao fim da linha com os ônibus a caminho, os mesmos ônibus no mapa, os pontos de ônibus do trajeto com a próxima passagem e, para o ponto da pessoa, a que horas o ônibus passa |
| Ver o ônibus ao vivo | Passageiros informam a posição sem nome, e quem espera vê o ônibus no mapa. Sem aviso, mostra o horário cadastrado |
| Seus carros | No perfil, cada pessoa cadastra modelo, ano, placa e combustível. A rota escolhe o carro e o combustível mais baratos para o trajeto, com consumo do Inmetro (modelos de 2010 a 2026, incluindo híbridos e elétricos) e preço semanal da ANP |
| Todas as opções em Rotas | Ao planejar uma rota, aparecem a pé, bike, ônibus, carro e também ônibus pelos pontos do OpenStreetMap (estimado), bicicleta de aluguel (fictícia) e carona. Escolher uma opção desenha o caminho por trechos no mapa (a pé até a bicicleta, depois pedalando) e lista o passo a passo. Cada opção mostra o horário de saída e chegada e o CO₂ evitado por dia, semana e mês |
| Iniciar rota | Depois de escolher uma opção, "Iniciar rota" guia a pessoa com o GPS em tempo real: mostra o passo atual e quanto falta, marca onde ela está no mapa, avisa se sai do traçado e termina ao chegar |
| Ruas e números de casa | A busca conhece as 1.625 ruas de Araçatuba e 75 mil números de casa (CNEFE do IBGE), mesmo sem internet. Número que não consta é estimado entre os vizinhos e marcado como aproximado. Clicar em qualquer parte do cartão de uma opção escolhe essa opção |
| Carona no mapa | O foco do app. Em **Rotas**, ao planejar o trajeto, aparecem todos os motoristas que passam perto, com o desvio de cada um (calculado pelas ruas do OpenStreetMap), e as rotas deles são desenhadas no mapa em laranja. Dá para pedir carona dali. Na aba **Caronas**, quem dá carona cadastra a rota, recebe as solicitações e vê o desvio, o mapa com a rota nova, o custo e o CO₂ antes de aceitar; quem pediu acompanha o status |
| Chat da carona | Passageiro e motorista conversam, por pedido, para combinar preço e ponto de encontro. O app não processa pagamento. Na demonstração, o motorista de exemplo responde sozinho |
| Caronas | Quem vai para um destino oferece vagas, e quem precisa pede. Telefone e placa só aparecem depois que a vaga é aceita. Sem pagamento pelo app |

## Interface

A interface usa o sistema visual **Vlak**, uma biblioteca CSS de licença MIT integrada pelo pacote `@noorddev/vlak`. A tipografia Inter e os estilos são incluídos no build, sem depender de uma folha de estilo externa. O CSS do GoGreen adapta os componentes ao uso no transporte urbano, com paleta verde e layout responsivo. O mapa continua usando Leaflet; navegação e diálogos permanecem implementados no próprio app.

## Rodar no computador

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal. No Windows, também dá para dar dois cliques em `iniciar.bat`, que instala o que falta e abre o navegador. Sem nenhuma configuração, o app roda em **modo demonstração**: os dados ficam só no navegador e tudo aparece marcado como exemplo.

## Roteiro para a apresentação

1. Em **Rotas**, escolha Terminal Urbano e Praça Rui Barbosa e toque em **Comparar rotas**. A recomendação é ir a pé.
1b. Ainda em **Rotas**, veja "Mais jeitos de ir": ônibus pelos pontos, bicicleta de aluguel (fictícia) e carona. Escolha uma opção para ver cada trecho no mapa e o passo a passo, e toque em **Conversar** na carona para abrir o chat com o motorista de exemplo.
2. Em **Ônibus**, escolha uma linha para ver o horário cadastrado.
3. No **perfil**, cadastre um carro e compare a rota de novo: o cartão do carro mostra o gasto com aquele carro.
4. Em **Caronas**, ofereça uma carona e aceite o pedido de exemplo.

## Ligar o banco de dados real (Neon na Vercel)

O banco é um Postgres do [Neon](https://neon.com), ligado pela Vercel. O navegador nunca fala com o banco: ele chama as funções de `api/` (`/api/auth` para entrar e criar conta, `/api/db` para o resto), que usam um cookie de sessão assinado.

1. Instale a CLI e entre: `npm i -g vercel`, `vercel login`, e `vercel link` dentro da pasta do projeto.
2. Crie o banco: `vercel integration add neon` (ele cria o projeto no Neon e grava `DATABASE_URL` nas variáveis da Vercel).
3. Crie o segredo das sessões, com pelo menos 32 caracteres aleatórios, e as variáveis do site:
   - `vercel env add AUTH_SECRET` (valor: gere com `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`)
   - `vercel env add VITE_USAR_BANCO` com o valor `1`
   - `vercel env add VITE_GOOGLE_MAPS_KEY` com a sua chave do Google
4. Baixe as variáveis e crie as tabelas: `vercel env pull .env.local` e depois `npm run db:migrar`.
5. Publique com `vercel deploy` (ou envie o projeto ao GitHub ligado à Vercel). Para testar localmente com o banco, use `vercel dev`.

Sem `VITE_USAR_BANCO=1` o app roda em modo demonstração, com dados só no navegador.

## Ligar o Google Maps

O mapa e a busca de lugares usam o Google Maps Platform. Sem a chave, o app abre, mas o mapa mostra um aviso de configuração.

As **rotas** (a pé, bike e carro, e o desvio das caronas) vêm do serviço gratuito do OpenStreetMap (`routing.openstreetmap.de`), sem chave e sem cota para configurar. É um serviço comunitário, sem garantia de disponibilidade; se ele não responder, o app mostra uma reta aproximada, marcada como estimativa.

1. No [Google Cloud](https://console.cloud.google.com/), crie um projeto e uma conta de cobrança (pede cartão, mas a demonstração fica na cota gratuita mensal de cada serviço).
2. Ative a **Maps JavaScript API** e a **Places API (New)**. A Routes API não é mais usada.
3. Crie uma chave de API e restrinja-a por **HTTP referrer** aos seus domínios (`localhost` e o da Vercel).
4. Defina um **limite de cota diária** e um **alerta de orçamento**, para garantir que não cobre.
5. Coloque a chave em `VITE_GOOGLE_MAPS_KEY`, no `.env` e na Vercel. Para produção, crie um Map ID próprio no Google Cloud (o código usa o `DEMO_MAP_ID` de teste).

Regras do Google: os resultados dele só podem aparecer com o mapa do Google e não podem ser guardados. As rotas a pé e de bicicleta estão em beta, e o app avisa isso na tela.

## Publicar (Vercel)

Importe o repositório na Vercel. O framework Vite é detectado sozinho. Ligue o Neon pela aba Storage da Vercel e coloque `AUTH_SECRET`, `VITE_USAR_BANCO=1` e `VITE_GOOGLE_MAPS_KEY` em Environment Variables (passo a passo na seção do banco acima). O GPS só funciona em HTTPS, que a Vercel já oferece.

## Testes

```bash
npm run lint      # erros de código
npm test          # cálculo, arquitetura e regras de segurança do banco (Postgres local)
npm run test:e2e  # telas em navegador real (Playwright), com o Google simulado
```

## Como o código está organizado

```
src/app/         inicialização, moldura da tela e navegação
src/features/    uma pasta por função: rotas, onibus, carros, perfil, caronas, conta
src/dados/       dados: servidor (api/ + Neon) ou modo demonstração, separado por assunto
src/servicos/    serviços externos: Google (lugares e rotas), pontos de ônibus, ruas do IBGE, preços e consumo
src/shared/      peças comuns: mapa do Google, avisos, diálogos, ícones
src/config/      valores do cálculo, linhas de ônibus e lugares
src/styles/      cores, tipografia e um CSS por componente
api/             função da Vercel que busca o preço dos combustíveis na ANP
scripts/         gera, no build, o consumo (Inmetro), os pontos de ônibus (OpenStreetMap) e as ruas com número (IBGE)
api/            funções da Vercel: login (auth.js) e acesso ao banco (db.js)
banco/          tabelas e regras de segurança do Neon (000_base.sql e migracoes/)
tests/           unit (com regras de arquitetura), database e e2e
docs/            arquitetura, especificação e mockup da interface
```

Os detalhes estão em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Dados e fontes

| Dado | Valor | Fonte |
| --- | --- | --- |
| CO₂ do carro | 98,2 g por passageiro.km | [BNDES, Souza e Vaz](https://web.bndes.gov.br/bib/jspui/bitstream/1408/27427/1/PRCapLiv_216304_%C3%94nibus%20el%C3%A9tricos%20e%20a%20descarboniza%C3%A7%C3%A3o%20da%20mobilidade%20urbana.pdf) |
| CO₂ do ônibus a diesel | 19,5 g por passageiro.km | Mesma fonte |
| Tarifa comum | R$ 5,30, confirmada em dez/2025 | [O Liberal Regional](https://lr1.com.br/cidades/aracatuba/tarifa-do-transporte-coletivo-pode-subir-para-r-1368-sem-subvencao-reprovada-pela-camara/) |
| Passe escolar | R$ 2,65, em abr/2025 | [Hojemais](https://www.hojemais.com.br/aracatuba/noticia/cotidiano/transporte-coletivo-em-aracatuba-tera-tarifa-zero-aos-domingos-e-feriados) |
| Gasolina em Araçatuba | R$ 6,31 por litro, em 12/09/2026 | [Numerando, com dados da ANP](https://numerando.com.br/combustiveis/cidade/aracatuba-sp) |
| Ruas e números de casa | 1.625 ruas e 75 mil números, Censo 2022 | [IBGE, CNEFE](https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/35_SP/) |
| Linhas e horários da TUA | 14 linhas, quadro de 20/09/2026 | [onibus.online](https://onibus.online/empresas/tua-transportes-urbanos-aracatuba/) |
| Base legal do tema | Acessibilidade universal e gestão democrática | [Lei 12.587/2012](https://www.mprj.mp.br/documents/20184/226705/Lei_12587.pdf) |

**Suposições do projeto, ajustáveis em `src/config/transporte.js`:** carro faz 12 km/l; ônibus anda a 20 km/h, com 10 min de espera e 10 min de caminhada; pesos da nota da recomendação.

## Limites conhecidos

- **Google:** o uso exige chave e conta de cobrança. As rotas a pé e de bicicleta estão em beta e podem não ter calçada ou ciclovia.
- **Relatos de problemas:** o sistema foi retirado do app (telas, alertas na recomendação e Painel). As tabelas continuam nas migrações do banco, sem uso.
- **Itinerário das linhas:** a fonte não publica as ruas, então o app não desenha o traçado real. A estimativa dos ônibus usa o caminho de carro do Terminal até o bairro que dá nome à linha (achado pelo Google, que pode errar o bairro) e não sabe por quais ruas a linha realmente passa. O tempo de ônibus é uma estimativa sobre o caminho de carro, e a previsão ao vivo usa a distância até você.
- **Linha 118:** a página da fonte não trazia horários.
- **Feriados e tarifa:** o quadro não trata feriados, e a tarifa de 2026 precisa ser confirmada com a TUA ou a prefeitura.
