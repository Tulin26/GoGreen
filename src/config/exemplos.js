import { PLACES } from './lugares.js';
                                                                                                                                  
                                                                        
const nextMorning = (days) => {
  const d = new Date(Date.now() + days * 86400000);
  d.setUTCHours(10, 30, 0, 0);
  return d.toISOString();
};

const ride = (id, motorista, origem, destino, days, vagas, livres, observacao) => ({
  id, motorista, car_label: 'Carro de exemplo', origem, destino, saida_em: nextMorning(days), vagas, vagas_livres: livres, observacao,
  minha: false, meu_pedido: null, meu_status: null, telefone: null, placa: null, isExample: true,
});

export const exampleRides = () => [
  ride('carona-1', 'Exemplo A', 'Terminal Urbano', 'Fatec Araçatuba', 1, 3, 2, 'Carona de exemplo.'),
  ride('carona-2', 'Exemplo B', 'Praça Rui Barbosa', 'Fatec Araçatuba', 2, 2, 2, null),
];

export const EXAMPLE_CAR = {
  id: 'carro-exemplo', marca: 'HONDA', modelo: 'CITY', versao: 'LX 1.5-16V', ano: 2026, placa: 'ABC1D23', combustivel: 'flex',
  km_l_gasolina: 13.9, km_l_etanol: 9.8, km_l_diesel: null, kwh_km: null, origem_consumo: 'inmetro', isExample: true,
};

                                                                                                  
export const EXAMPLE_BIKE_STATIONS = [
  { id: 'bike-terminal', nome: 'Terminal Urbano', coords: [-21.2031690, -50.4385078], isExample: true },
  { id: 'bike-rui', nome: 'Praça Rui Barbosa', coords: [-21.2062250, -50.4388758], isExample: true },
  { id: 'bike-fatec', nome: 'Fatec Araçatuba', coords: [-21.1816274, -50.4496867], isExample: true },
  { id: 'bike-centro', nome: 'Centro (Av. Brasília)', coords: [-21.2085, -50.4330], isExample: true },
  { id: 'bike-ipanema', nome: 'Jardim Ipanema', coords: [-21.1870, -50.4470], isExample: true },
];

                                                                                                               
const at = (title) => PLACES.find((p) => p.title === title).point;
const WEEK = [1, 2, 3, 4, 5];
const driver = (n, nome, origem, destino, hora, dias, vagas_livres) => ({ id: `exd-${n}`, motorista: nome, origem, destino, from: at(origem), to: at(destino), hora, dias, vagas_livres, isExample: true });
export const EXAMPLE_DAILY_RIDES = [
  driver(1, 'Carlos (exemplo)', 'Terminal Urbano', 'Fatec Araçatuba', '07:00', WEEK, 3),
  driver(2, 'Marina (exemplo)', 'Praça Rui Barbosa', 'Fatec Araçatuba', '18:30', WEEK, 2),
  driver(3, 'Paulo (exemplo)', 'Fatec Araçatuba', 'Terminal Urbano', '12:10', [1, 3, 5], 1),
  driver(4, 'Fernanda (exemplo)', 'Rodoviária', 'Shopping Praça Nova', '08:15', WEEK, 3),
  driver(5, 'Rafael (exemplo)', 'Shopping Praça Nova', 'Prefeitura de Araçatuba', '17:45', WEEK, 2),
  driver(6, 'Juliana (exemplo)', 'Santa Casa', 'UNESP Araçatuba', '07:30', [1, 2, 3, 4], 2),
  driver(7, 'Marcos (exemplo)', 'UNESP Araçatuba', 'Terminal Urbano', '17:30', [1, 2, 3, 4], 3),
  driver(8, 'Beatriz (exemplo)', 'Terminal Urbano', 'Universidade Paulista (Unip)', '18:00', WEEK, 1),
  driver(9, 'Lucas (exemplo)', 'Prefeitura de Araçatuba', 'Hospital Unimed', '06:50', WEEK, 2),
  driver(10, 'Camila (exemplo)', 'Lago Azul', 'Praça Rui Barbosa', '07:40', [1, 2, 3, 4, 5, 6], 3),
  driver(11, 'Renato (exemplo)', 'Lago Azul', 'Fatec Araçatuba', '06:45', WEEK, 2),
  driver(12, 'Patrícia (exemplo)', 'Fatec Araçatuba', 'Lago Azul', '22:30', [1, 2, 3, 4], 3),
  driver(13, 'Diego (exemplo)', 'Parque Ecológico Baguaçu', 'Terminal Urbano', '07:15', WEEK, 2),
  driver(14, 'Aline (exemplo)', 'Terminal Urbano', 'Parque Ecológico Baguaçu', '17:50', WEEK, 3),
  driver(15, 'Gustavo (exemplo)', 'Estádio Adhemar de Barros', 'Fatec Araçatuba', '07:05', WEEK, 2),
  driver(16, 'Larissa (exemplo)', 'Fatec Araçatuba', 'Estádio Adhemar de Barros', '12:30', [1, 2, 3, 4, 5], 2),
  driver(17, 'Thiago (exemplo)', 'Poupatempo', 'Santa Casa', '07:50', WEEK, 1),
  driver(18, 'Bruna (exemplo)', 'Santa Casa', 'Poupatempo', '16:40', WEEK, 2),
  driver(19, 'Felipe (exemplo)', 'Câmara Municipal', 'Shopping Praça Nova', '12:00', [1, 2, 3, 4, 5], 3),
  driver(20, 'Vanessa (exemplo)', 'Shopping Praça Nova', 'Câmara Municipal', '19:00', [5, 6], 3),
  driver(21, 'André (exemplo)', 'Fórum', 'Universidade Paulista (Unip)', '18:15', [1, 2, 3, 4], 2),
  driver(22, 'Carolina (exemplo)', 'Universidade Paulista (Unip)', 'Fórum', '13:00', [1, 2, 3, 4], 1),
  driver(23, 'Eduardo (exemplo)', 'Aeroporto de Araçatuba', 'Terminal Urbano', '06:30', [1, 3, 5], 3),
  driver(24, 'Sabrina (exemplo)', 'Terminal Urbano', 'Aeroporto de Araçatuba', '16:00', [1, 3, 5], 2),
  driver(25, 'Rodrigo (exemplo)', 'Hospital Unimed', 'Lago Azul', '19:30', WEEK, 2),
  driver(26, 'Tatiane (exemplo)', 'Praça Rui Barbosa', 'UNESP Araçatuba', '07:20', WEEK, 3),
  driver(27, 'Henrique (exemplo)', 'UNESP Araçatuba', 'Praça Rui Barbosa', '12:15', WEEK, 2),
  driver(28, 'Mariana (exemplo)', 'Rodoviária', 'Fatec Araçatuba', '07:10', WEEK, 2),
  driver(29, 'Leandro (exemplo)', 'Fatec Araçatuba', 'Rodoviária', '17:35', WEEK, 3),
  driver(30, 'Priscila (exemplo)', 'Prefeitura de Araçatuba', 'Lago Azul', '17:20', WEEK, 2),
  driver(31, 'Vinícius (exemplo)', 'Parque Ecológico Baguaçu', 'Shopping Praça Nova', '09:30', [6, 0], 3),
  driver(32, 'Isabela (exemplo)', 'Terminal Urbano', 'Shopping Praça Nova', '14:00', [6, 0], 2),
  driver(33, 'Otávio (exemplo)', 'Santa Casa', 'Terminal Urbano', '06:20', WEEK, 2),
];
