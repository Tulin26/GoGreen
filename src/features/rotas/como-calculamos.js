import { BUS, CO2_G_PER_PKM, COST, WEIGHTS } from '../../config/transporte.js';
import { closeButton, openDialog } from '../../shared/ui/dialogo.js';
import { CO2 } from '../../shared/ui/dom.js';
import { priceNote } from '../carros/precos.js';

export function howWeCalculate(prices) {
  const money = (v) => v.toFixed(2).replace('.', ',');
  openDialog({
    html: `<div class="dialogo__corpo">
      <div class="dialogo__cabeca"><h2 class="dialogo__titulo">Como calculamos</h2>${closeButton}</div>
      <div class="texto-corrido">
        <p>A recomendação fica com a menor nota: <strong>minutos + reais + (gramas de ${CO2} / ${Math.round(1 / WEIGHTS.perGram)})</strong>.</p>
        <h3>Dados com fonte</h3>
        <ul>
          <li>${CO2}: carro 98,2 g e ônibus a diesel 19,5 g por passageiro.km. <a href="https://web.bndes.gov.br/bib/jspui/bitstream/1408/27427/1/PRCapLiv_216304_%C3%94nibus%20el%C3%A9tricos%20e%20a%20descarboniza%C3%A7%C3%A3o%20da%20mobilidade%20urbana.pdf" target="_blank" rel="noopener">BNDES, Souza e Vaz</a>. Bike e caminhada contam só a emissão direta, que é zero.</li>
          <li>Tarifa de ônibus: R$ ${money(COST.busFare)}, último valor que confirmamos, de dez/2025. <a href="https://lr1.com.br/cidades/aracatuba/tarifa-do-transporte-coletivo-pode-subir-para-r-1368-sem-subvencao-reprovada-pela-camara/" target="_blank" rel="noopener">O Liberal Regional</a>. Confira o valor atual.</li>
          <li>Combustível: gasolina R$ ${money(prices.precos.gasolina)}, etanol R$ ${money(prices.precos.etanol)} e diesel S10 R$ ${money(prices.precos.diesel)} por litro. ${priceNote(prices)} A ANP publica por semana, não por dia. <a href="https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas" target="_blank" rel="noopener">ANP</a>.</li>
          <li>Consumo e CO<sub>2</sub> fóssil dos carros cadastrados pela lista: <a href="https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular" target="_blank" rel="noopener">tabelas do Inmetro</a>, modelos de 2010 a 2026. No mundo real, o consumo varia com o jeito de dirigir e o estado do carro. Com etanol e eletricidade, a tabela lista 0 g de CO<sub>2</sub> fóssil, mas a comparação mantém o valor de referência do carro, porque produzir os dois também emite.</li>
          <li>Carro elétrico: usamos R$ ${money(prices.precos.eletrico)} por kWh. É uma <strong>suposição do projeto</strong>: confira o valor na sua conta de luz.</li>
          <li>Rotas de carro, bike e a pé, busca de lugares e mapa: Google Maps. As rotas a pé e de bicicleta estão em fase beta no Google.</li>
          <li>Pontos de ônibus: © colaboradores do OpenStreetMap. Ruas e números de casa: IBGE, CNEFE (Censo 2022).</li>
        </ul>
        <h3>Suposições do projeto</h3>
        <ul>
          <li>Sem carro cadastrado, o cálculo usa ${COST.carKmPerLiter} km por litro de gasolina. O custo do carro é só o combustível.</li>
          <li>Moto: estimamos ${COST.motoKmPerLiter} km/L e ${Math.round(CO2_G_PER_PKM.moto)} g de CO₂/km como referência do projeto; o gasto real varia com o modelo e a condução.</li>
          <li>Ônibus anda a ${BUS.kmh} km/h, com ${BUS.waitMin} min de espera e ${BUS.accessWalkMin} min de caminhada. Como não temos o itinerário das linhas, o trecho usa o caminho de carro.</li>
          <li>Os pesos da nota são um critério nosso, não um dado oficial.</li>
        </ul>
      </div></div>`,
  });
}
