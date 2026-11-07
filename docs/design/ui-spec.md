# GoGreen: especificação de interface

Referência visual: `mockup.html`. Markup pronto para copiar está lá.

## 1. Ideia do design

A interface usa o código da sinalização viária brasileira. Cada cor e forma tem o mesmo significado que tem na rua, e nunca é usada só como enfeite.

| Sinal | Significado no app |
|---|---|
| Placa verde com filete branco | A recomendação. Só existe uma por resultado. Também é o logo. |
| Placa amarela adicional, presa embaixo da verde | Explica por que os relatos mudaram a recomendação |
| Placa azul | Linha de ônibus e ponto |
| Losango amarelo | Alerta de atenção |
| Octógono vermelho | Alerta grave |
| Listras laranja e preto | Simulação (como as placas de obra: temporário, não é a situação normal) |
| Asfalto com linha tracejada | Barra superior e navegação. O item ativo vira faixa dupla amarela. |

Fora desses casos, a tela é neutra: fundo claro, texto escuro e bordas firmes.

## 2. Navegação

Cinco destinos, iguais em celular e desktop. Rotas por hash. Abaixo de 860 px a navegação fica embaixo; acima, em cima, junto do logo.

| Rota | Aba | Conteúdo |
|---|---|---|
| `#/rotas` | Rotas | Tela inicial |
| `#/onibus` | Ônibus | Previsão e posição |
| `#/mapa` | Mapa | Relatos no mapa |
| `#/relatar` | Mapa fica ativa | Formulário, com "Voltar ao mapa" |
| `#/turmas` | Turmas | Ranking e impacto |
| `#/painel` | Painel | Painel da prefeitura |

A barra superior sempre mostra logo, "Dados de demonstração" (enquanto houver dados fictícios) e alternância de tema.

## 3. Rotas

**Fluxo:** digita origem e destino, toca em "Comparar rotas", vê a recomendação e os outros três modos. Toque em um chip de alerta abre o relato no mapa. "Ver caminho" abre o mapa com o trajeto.

No celular o mapa não aparece até o toque em "Ver caminho", para economizar dados. No desktop ele fica sempre à direita.

### Textos

- Título (só antes da busca): **Qual é o melhor jeito de chegar lá hoje?**
- Campos: **De onde** / **Para onde**; placeholder: *Rua, bairro ou lugar*
- Origem vazia: oferecer **Usar minha localização** nas sugestões
- Opções: **Tenho bike**, **Tenho carro**, **Rota acessível: evita calçada ruim e falta de rampa**. Guardar em `localStorage`.
- Botão: **Comparar rotas**
- Apoio: *Quem mora aqui avisa o que tem no caminho, e a recomendação muda com isso.*
- Cabeçalho do resultado: **{origem} até {destino}** / *Hoje às {hh:mm}, à noite. {x,x} km.*
- Rodapé: *Custo e CO₂ são estimativas com valores de exemplo.* + **Como calculamos**

### Estados

| Estado | O que mostrar |
|---|---|
| Vazio | Título, busca, opções, botão |
| Carregando | `Comparando rotas…` (`role="status"`) + 3 `.esqueleto` |
| Campo faltando | Sob o campo: *Digite para onde você vai.* |
| Sem GPS | **Não conseguimos sua localização** / *Ative a localização do navegador ou digite o endereço.* / **Digitar endereço** |
| Sem caminho | **Não encontramos caminho até esse destino** / *Confira o endereço ou escolha um lugar próximo em Araçatuba.* / **Editar destino** |
| Fora da cidade | **Esse lugar fica fora de Araçatuba** / *Por enquanto, o GoGreen compara rotas só dentro da cidade.* / **Editar destino** |
| Sem rede | **Você está sem internet** / *Para comparar rotas, conecte-se e tente de novo.* / **Tentar de novo** |
| Relatos indisponíveis | Mostrar as rotas sem recomendação por alertas, com o aviso *Não foi possível carregar os relatos. A comparação não considera alertas agora.* |

### Cartão de rota

Ordem fixa: recomendada na placa verde; depois os outros por nota. Cada cartão traz:

1. Ladrilho do modo + nome (ícone e texto, sempre)
2. Três métricas alinhadas: tempo, custo, CO₂
3. Alertas: resumo (*2 alertas no caminho*) + um chip por alerta, com o nome do problema
4. **Ver caminho**

Regras de texto:

- A menor métrica troca o rótulo: **mais rápido**, **mais barato**, **menos CO₂**. Empate: todos os empatados recebem o rótulo. Não usar só negrito ou cor.
- No ônibus, o rótulo do tempo é **tempo com espera**. Sempre traz o selo da fonte: `AO VIVO` + *próximo em 4 min*, `HORÁRIO` + *próximo às 19:40*, ou `SIMULAÇÃO` + *próximo em 3 min*.
- Sem alertas: nota *Sem alertas no caminho*.
- A recomendada nunca esconde os próprios alertas.
- Bike ou carro não marcados: nota *Marque "Tenho bike" para entrar na recomendação* (ou carro). As métricas continuam visíveis.
- Ônibus sem horário e sem aviso: tempo "Sem previsão", nota *Esta linha não tem horário cadastrado*. Fica fora da recomendação.

Escreva CO₂ como `CO<sub>2</sub>`: a fonte não tem o caractere ₂.

### Regra da recomendação

**Candidatos:** a pé (até 45 min) e ônibus (com previsão), mais bike e carro se marcados. Se houver só um candidato, ele é o recomendado.

```
nota_base = minutos + reais + (gramas_co2 / 5)
nota      = nota_base + soma(penalidade de cada alerta que se aplica ao modo)
```

Menor nota vence. Empate: menos CO₂. Com **Rota acessível**, a bike sai dos candidatos.

| Severidade | Penalidade | Origem | Chip |
|---|---|---|---|
| Leve | +2 | Ponto sem cobertura | Círculo/ícone azul, fundo claro |
| Atenção | +10 | Relato "Dá, com cuidado" | Losango, fundo amarelo |
| Grave | +20 | Relato "Não dá para passar" | Octógono, fundo vermelho |

| Problema | A pé | Bike | Carro | Ônibus |
|---|---|---|---|---|
| Buraco | só se grave | sim | só se grave | não |
| Calçada quebrada | sim | não | não | não |
| Falta de rampa | só com Rota acessível | não | não | não |
| Má iluminação | sim, 18h–6h | sim, 18h–6h | não | não |
| Ponto sem cobertura | não | não | não | sim, sempre leve |

Com **Rota acessível**, calçada quebrada e falta de rampa contam como graves para quem vai a pé.

Um alerta se aplica se o status for aberto ou em análise e se estiver a até 30 m do trajeto. Resolvido não conta.

**Explicação.** Calcule o vencedor pela `nota_base` e pela `nota`. Se forem diferentes, mostre a placa adicional:

> **Os relatos mudaram a recomendação**
> {Modo base} seria a primeira opção, mas hoje tem {n} alerta(s) no caminho: {lista}. {Vencedor} evita {os dois | esse alerta | {k} deles}.

O "evita" é calculado: conte só os alertas do modo base que não se aplicam ao vencedor. Se for zero, troque a última frase por *{Vencedor} tem o caminho com menos risco.*

O cartão do modo base recebe a nota *Seria a primeira opção sem os alertas*.

Se não mudou, não há placa amarela. Se todos os candidatos tiverem alerta grave, acrescente à recomendada: *Todas as opções têm alerta grave. Esta é a de menor risco.*

**Exemplo do mockup (valores de exemplo, 1 km, 19:20):**

| Modo | Tempo | Custo | CO₂ | Base | Alertas | Nota |
|---|---|---|---|---|---|---|
| A pé | 12 min | R$ 0 | 0 g | 12 | calçada +10, iluminação +10 | 32 |
| Ônibus | 14 min | R$ 5,00 | 40 g | 27 | cobertura +2 | 29 |
| Bike (não marcada) | 6 min | R$ 0 | 0 g | 6 | buraco grave +20, iluminação +10 | 36 |
| Carro (não marcado) | 5 min | R$ 1,20 | 150 g | 36,2 | nenhum | 36,2 |

Vencedor base: a pé. Vencedor final: ônibus. Por isso aparece a placa amarela.

**Cálculo de custo e CO₂:** tarifa, custo por km e gramas por km são placeholders. Use-os em um único arquivo de configuração e substitua por valores com fonte citada antes da apresentação. **Como calculamos** abre uma folha com a fórmula e as fontes.

## 4. Ônibus

**Quem espera:** escolhe linha e ponto (lembrar a última escolha), vê selo, previsão e mapa.

**Quem está no ônibus:**

1. Toca em **Estou neste ônibus**
2. Confirmação: **Avisar quem está no ponto?** / *Sua localização vai sem nome, só enquanto você informar. Paramos sozinhos depois de 45 min.* / **Começar a informar** · **Agora não**
3. Navegador pede o GPS
4. Cartão `.informando`: **Você está informando a Linha D1** / *Quem está no ponto já vê o ônibus. +2 pontos a cada 5 min.* / **Parar de informar**
5. Ao parar: toast *Obrigado. +{n} pontos para {turma}.*

Use `watchPosition` com ID aleatório por viagem, sem vínculo com a pessoa, e sem guardar o trajeto depois da viagem. Se a pessoa não escolheu turma, os pontos são descartados e o toast omite essa parte.

### Os três rótulos

O selo fica sempre colado à previsão, nunca em outra parte da tela.

| | AO VIVO | HORÁRIO | SIMULAÇÃO |
|---|---|---|---|
| Quando | Aviso de passageiro há até 90 s | Sem aviso recente | Modo Simulação ligado |
| Selo | Verde + ícone de sinal | Contorno + relógio | Laranja com listras |
| Valor | **4 min**, peso forte | **19:40**, hora da tabela, peso médio | **3 min**, peso forte |
| Texto do selo | *Atualizado há 20 s por 2 passageiros* | *Ninguém informando esta linha agora* | *Ônibus fictício, não é a posição real* |
| Texto da previsão | *para chegar ao seu ponto. Faltam 2 pontos.* | ***Previsão pelo horário cadastrado.** Não sabemos onde o ônibus está, então ele pode adiantar ou atrasar.* | *Previsão simulada para a apresentação.* |
| Ônibus no mapa | Pino azul | **Nenhum pino.** Só o ponto e o trajeto da linha. | Pino laranja tracejado com "SIM" |
| Faixa dos pontos | Sim | Não | Sim, com o ícone laranja |

Proibido: mostrar horário cadastrado como "x min", desenhar ônibus sem posição recebida, ou usar a palavra "ao vivo" em dado de tabela.

**Transições:**

- Entre 90 s e 3 min sem aviso: continua AO VIVO, com *Última posição há {n} min* e valor *cerca de {n} min*.
- Depois de 3 min: passa a HORÁRIO e mostra o toast *Perdemos o sinal do ônibus. Voltamos ao horário cadastrado.*
- Abaixo de 1 min: valor **Chegando**.

### Modo Simulação

- Liga por **Simular ônibus (apresentação)** no fim da tela Ônibus, ou por `?sim=1` no endereço.
- `.faixa-simulacao` fixa em **todas** as telas: **SIMULAÇÃO.** *Ônibus e posição não são reais.* + **Sair**. Não pode ser fechada de outro jeito nem rolar para fora da tela.
- Os cartões de rota também usam o selo SIMULAÇÃO quando o ônibus vier dela.
- Enquanto ligado, nada vale ponto, não entra no Painel e "Estou neste ônibus" fica oculto.

### Estados

| Estado | O que mostrar |
|---|---|
| Nenhuma linha escolhida | **Qual ônibus você espera?** + lista de linhas |
| Carregando | `Buscando o ônibus…` + esqueleto |
| Sem dados de ônibus | **Esta linha não tem horário cadastrado** / *Sem aviso de passageiros e sem tabela, não dá para prever a chegada.* / **Escolher outra linha** |
| Fim do serviço | Selo HORÁRIO + **Sem mais ônibus hoje** / *Próximo: amanhã às {hh:mm}.* |
| Sem GPS ao informar | **Não conseguimos sua localização** / *Sem o GPS não dá para informar o ônibus. Ative a localização do navegador.* / **Tentar de novo** |
| Sem rede, esperando | Selo HORÁRIO + *Sem internet. Mostrando o horário salvo no aparelho.* |
| Sem rede, informando | Mantém o cartão + *Sem internet. Tentando reconectar…* |

## 5. Mapa e relatos

**Fluxo:** o mapa abre centrado em Araçatuba; o usuário toca em um pino ou item da lista para ver o detalhe, ou em **Relatar problema**.

**Pinos (`.pino`, para `L.divIcon`):** losango amarelo = aberto, atenção; octógono vermelho = aberto, grave; círculo azul com lupa = em análise; círculo branco com visto = resolvido. O ícone do tipo vai dentro do losango e do octógono.

**Folha inferior:** botão **Relatar problema**, título **Problemas por perto**, filtros **Todos** / **Abertos** (inclui em análise) / **Resolvidos**, lista. A alça alterna `data-estado="recolhida"` por toque ou teclado (não dependa de arrastar). No desktop a folha vira a coluna esquerda.

**Detalhe do relato:** na mesma folha: tipo, severidade, endereço, data, status com ícone e texto, foto (carrega só ao abrir) e **Ver no mapa**.

| Estado | O que mostrar |
|---|---|
| Nada na área | **Nenhum problema relatado aqui** / *Viu um buraco ou uma calçada quebrada? Conte para os vizinhos.* / **Relatar problema** |
| Filtro vazio | *Nenhum relato com esse status nesta área.* + **Ver todos** |
| Carregando | `Buscando relatos…` + esqueleto baixo |
| Sem GPS | Abre no centro da cidade, sem aviso bloqueante |
| Sem rede | Lista salva + *Sem internet. Estes relatos podem estar desatualizados.* |
| Tiles não carregaram | Lista continua funcionando + *O mapa não carregou. Tentar de novo* |

### Formulário de relato (`#/relatar`)

Uma única tela, sem etapas. Só o botão de envio é fixo.

| Campo | Texto | Regra |
|---|---|---|
| Tipo | **Qual é o problema?** Buraco, Falta de rampa, Má iluminação, Ponto sem cobertura, Calçada quebrada | Obrigatório |
| Severidade | **Dá para passar?** Dá, com cuidado / Não dá para passar | Obrigatório. Oculto em "Ponto sem cobertura", que é sempre leve |
| Local | **Onde?** *Arraste o mapa para ajustar.* | Obrigatório. Pino fixo no centro; usa o GPS se houver |
| Foto | **Foto** (ajuda a resolver mais rápido) / **Tirar ou escolher foto** / *Não fotografe rostos nem placas de carro. A foto é reduzida antes do envio.* | Opcional. `capture="environment"` |
| Detalhes | **Detalhes** (opcional) / *Ex.: o buraco fica junto à guia* | Até 280 caracteres |

Botão: **Enviar relato**. Reduza a foto no navegador com canvas (lado maior de 1280 px, JPEG 0,7), o que também remove os dados EXIF.

| Situação | Texto |
|---|---|
| Sem tipo | *Escolha o tipo de problema.* |
| Sem severidade | *Diga se dá para passar.* |
| Sem local | *Marque o local no mapa para enviar.* |
| Sem GPS | *Não conseguimos sua localização. Arraste o mapa até o local.* |
| Foto recusada | *Esse arquivo não é uma imagem. Escolha uma foto.* |
| Enviando | Botão desabilitado: **Enviando…** |
| Sucesso | Volta ao mapa, com toast *Relato enviado. +10 pontos para {turma}.* |
| Falha do servidor | *O relato não foi enviado. Seus dados continuam aqui.* + **Tentar de novo** |
| Sem rede | Salva no aparelho + toast *Relato salvo. Vamos enviar quando a internet voltar.* |

## 6. Turmas

**Conteúdo:** cartão da própria turma (*340 pontos. Faltam 20 para passar {turma}.*), ranking, **O que você fez**, **Como ganhar pontos**. A primeira posição usa troféu com `sr-only` "1º". A turma do usuário usa fundo invertido e `aria-current="true"`.

| Ação | Pontos (exemplo) |
|---|---|
| Informar o ônibus, a cada 5 min | +2 |
| Enviar um relato com foto | +10 (+5 sem foto) |
| Seu relato é resolvido | +5 |

Para reduzir fraude, limite os pontos por dia e por aparelho e não conte simulação.

| Estado | O que mostrar |
|---|---|
| Sem turma | **Escolha sua turma para somar pontos** + lista + **Escolher turma** |
| Sem pontos | **Sua turma ainda não pontuou** / *Informe o ônibus ou relate um problema para começar.* / **Relatar problema** |
| Carregando | Esqueleto |
| Sem rede | Último ranking salvo + *Sem internet. Ranking de {hh:mm}.* |

## 7. Painel

Público, sem login. Três totais, uma tabela de regiões (ordenada por abertos) e uma nota explicando o atraso médio. Abaixo de 860 px, as colunas "Em análise" e "Mais comum" somem.

- Título da tabela: **Regiões com mais problemas abertos**
- Atraso: *Atraso médio: diferença entre o horário cadastrado e os avisos ao vivo dos passageiros.*
- Barras: uma cor neutra (`--cor-dado`), sem cor de severidade, sempre com o número. A largura é relativa à maior região.
- Enquanto fictício, `.aviso-dados`: ***Dados de demonstração.** Estes números ilustram o painel e não descrevem Araçatuba.*

| Estado | O que mostrar |
|---|---|
| Sem dados | **Ainda não há relatos para mostrar** / *O painel se preenche conforme os moradores enviam relatos e avisam os ônibus.* |
| Sem atraso | Célula "Sem dados", não "0 min" |
| Carregando | Esqueleto baixo x 3 + `Carregando painel…` |
| Erro | **Não foi possível carregar o painel** / *Verifique a conexão e tente de novo.* / **Tentar de novo** |

## 8. Dados de demonstração

- Enquanto houver dado fictício, "Dados de demonstração" fica na barra superior. No Painel também há o aviso próprio.
- Marque cada registro fictício com `demo: true`. O aviso aparece se qualquer dado da tela tiver essa marca. Não ligue isso a uma variável manual.
- Nome de linha fictícia começa com D (Linha D1), para não parecer linha real.
- Não mostre "X toneladas de CO₂ evitadas" ou totais parecidos com dados de exemplo.
- O mockup cita ruas e zonas reais só para dar contexto. Antes da apresentação, confira se nenhum relato ou número fictício parece um fato sobre a cidade.

## 9. Acessibilidade e dados móveis

- Selos, alertas e status já têm forma, ícone e texto. Não remova nenhum dos três.
- Alvos de 44 px no mínimo, inclusive filtros, chips e links de texto. A exceção é o link de atribuição do mapa, que é parte do próprio Leaflet.
- Previsão em `aria-live="polite"`, atualizando no máximo uma vez por minuto. Não anuncie cada novo GPS.
- Toasts em `role="status"` (erros em `role="alert"`), por pelo menos 6 s, sem ações essenciais só dentro deles.
- Ao trocar de tela, leve o foco para o título. Ao abrir a folha, leve o foco para ela; Esc fecha.
- Toda informação do mapa também está em lista: pinos têm item correspondente e nome acessível (`aria-label` ou `alt` em `L.marker`).
- `prefers-reduced-motion` já desliga animações no CSS. No JS, use também `map.setView` sem animação (`animate: false`) nesse caso.
- Dados móveis: a fonte tem 39 KB, em `font-display: swap`. Importe o Leaflet só ao abrir o mapa. Não baixe fotos na lista. Atualize o ônibus a cada 15 s, e só com a aba visível.
- O GPS exige HTTPS (localhost é a exceção).
