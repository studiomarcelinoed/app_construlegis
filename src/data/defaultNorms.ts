import { LawDocument } from '../types';

export const DEFAULT_LEGISLATION_DOCUMENTS: LawDocument[] = [
  {
    id: 'norma-nbr-9050',
    title: 'ABNT NBR 9050:2020 - Acessibilidade a edificações, mobiliário, espaços e equipamentos urbanos',
    code: 'NBR 9050:2020',
    category: 'acessibilidade',
    jurisdiction: 'ABNT',
    summary: 'Critérios e parâmetros técnicos para rampas, vãos de portas, escadas, sanitários acessíveis, corrimãos e sinalização tátil.',
    dateAdded: '2026-01-15',
    active: true,
    sourceType: 'built_in',
    pageCount: 162,
    content: `[ABNT NBR 9050:2020]

ITEM 6.6 - RAMPAS E INCLINAÇÕES
6.6.1 São consideradas rampas as superfícies de piso com declividade igual ou superior a 5%.
6.6.2.1 A inclinação máxima admissível para rampas em novas construções é de 8,33% (1:12), com desnível máximo de 0,80 m por segmento de rampa.
6.6.2.2 Quando a inclinação situar-se entre 6,25% e 8,33%, devem ser previstos patamares intermediários a cada 0,80 m de desnível.
6.6.2.3 Em reformas ou situações consolidadas onde seja comprovadamente inviável atender a 8,33%, são permitidas inclinações de até 10,00% (para desníveis máximos de 0,20 m) e até 12,5% (para desníveis máximos de 0,075 m).
6.6.3 Largura livre de rampas: A largura mínima recomendada para rampas em rotas acessíveis de uso comum é de 1,50 m, sendo o mínimo admissível de 1,20 m.
6.6.4 Patamares das rampas: Devem ter extensão mínima de 1,20 m na direção do movimento no início e término de cada segmento, além de piso antiderrapante.

ITEM 6.9 - ESCADAS E DEGRAUS
6.9.1 As escadas devem atender ao dimensionamento ergonômico segundo a fórmula de Blondel: 63 cm <= 2E + P <= 65 cm, onde E é o espelho e P é o piso do degrau.
6.9.2 O espelho (E) deve medir entre 16 cm e 18 cm, e o piso (P) deve medir entre 28 cm e 32 cm.
6.9.3 O primeiro e o último degrau de um lance de escada devem distar no mínimo 0,30 m da área de circulação adjacente e dispor de sinalização tátil de alerta no piso.

ITEM 6.13 - CORRIMÃOS E GUARDA-CORPOS
6.13.1 Os corrimãos devem ser instalados em ambos os lados de escadas e rampas, a duas alturas: 0,92 m e 0,70 m do piso acabado.
6.13.2 O prolongamento dos corrimãos deve ser de no mínimo 30 cm no início e término da rampa ou escada, com extremidades curvadas para a parede ou piso.
6.13.3 A seção do corrimão deve ser circular com diâmetro entre 3,0 cm e 4,5 cm, ou com formato anatômico equivalente que permita a preensão contínua.

ITEM 6.11 - PORTAS E VÃOS DE PASSAGEM
6.11.1 As portas em rotas acessíveis devem ter vão livre útil mínimo de 0,80 m (folha de 90 cm recomendada para desconto do batente) e altura mínima de 2,10 m.
6.11.2 As maçanetas devem ser preferencialmente do tipo alavanca, instaladas a uma altura entre 0,80 m e 1,00 m do piso acabado.

ITEM 7.3 - SANITÁRIOS E VESTIÁRIOS ACESSÍVEIS
7.3.1 Deve ser garantida área de giro de 360° livre de obstáculos com diâmetro mínimo de 1,50 m.
7.3.2 A bacia sanitária deve possuir altura entre 0,43 m e 0,45 m (sem assento) ou 0,46 m e 0,48 m (com assento) e prever barras de apoio laterais e posterior a 0,75 m de altura.`
  },
  {
    id: 'norma-codigo-obras',
    title: 'Código de Obras e Edificações - Padrão Geral e Parâmetros Urbanísticos Municipais',
    code: 'Código de Obras Modelo (COE)',
    category: 'codigo_obras',
    jurisdiction: 'Municipal',
    summary: 'Parâmetros de recuos obrigatórios, iluminação, ventilação natural, pés-direitos mínimos e condições de habitabilidade.',
    dateAdded: '2026-01-15',
    active: true,
    sourceType: 'built_in',
    pageCount: 88,
    content: `[CÓDIGO DE OBRAS E EDIFICAÇÕES - LEI COMPLEMENTAR URBANÍSTICA]

CAPÍTULO IV - RECUOS E AFASTAMENTOS OBRIGATÓRIOS
Art. 42. O recuo frontal obrigatório para vias locais residenciais e comerciais é de no mínimo 4,00 m a 5,00 m a partir do alinhamento predial do lote, ressalvadas previsões mais restritivas de Zonas de Preservação.
Art. 43. Afastamentos laterais e de fundos:
§ 1º Paredes cegas (sem abertura de janelas ou portas): É permitida a edificação encostada na divisa até a altura máxima de 6,00 m a 8,00 m (conforme zona de uso), observada a legislação de vizinhança.
§ 2º Paredes com aberturas (janelas, terraços, varandas ou eirados): É obrigatório o afastamento mínimo de 1,50 m em relação a qualquer divisa lateral ou de fundos do lote (em conformidade estrita com o Art. 1.301 do Código Civil Brasileiro).

CAPÍTULO V - PÉ-DIREITO E DIMENSÕES MÍNIMAS DE COMPARTIMENTOS
Art. 50. O pé-direito mínimo livre nos compartimentos de permanência prolongada (salas, dormitórios, escritórios e consultórios) é de 2,60 m a 2,70 m.
Art. 51. Nos compartimentos de permanência transitória (sanitários, lavabos, corredores, despensas, áreas de serviço e depósitos), o pé-direito mínimo admitido é de 2,30 m a 2,40 m.
Art. 52. Garagens cobertas e estacionamentos coletivos: Pé-direito livre mínimo de 2,30 m sob vigas e tubulações suspensas.

CAPÍTULO VI - ILUMINAÇÃO E VENTILAÇÃO NATURAL
Art. 60. Todos os compartimentos de permanência prolongada devem ter aberturas diretas para o exterior para iluminação e ventilação.
§ 1º A área líquida total dos vãos de iluminação natural não pode ser inferior a:
  a) 1/6 (um sexto) da área total do piso nos quartos, dormitórios e salas residenciais;
  b) 1/8 (um oitavo) da área do piso para cozinhas e áreas de serviço;
  c) 1/10 (um décimo) da área do piso para banheiros e lavabos (mínimo absoluto de 0,40 m²).
§ 2º A área de ventilação efetiva (abertura útil) deve corresponder a no mínimo metade (50%) da área exigida para iluminação.

CAPÍTULO VII - ESCADAS E CIRCULAÇÕES COLETIVAS
Art. 71. As escadas de uso coletivo em edifícios de apartamentos ou comerciais devem ter largura útil mínima de 1,20 m, degraus antiderrapantes e não apresentar leques compensados perigosos em rotas de fuga.`
  },
  {
    id: 'norma-nr-18',
    title: 'Norma Regulamentadora nº 18 (NR-18) - Segurança e Saúde no Trabalho na Indústria da Construção',
    code: 'NR-18 (MTE)',
    category: 'seguranca_trabalho',
    jurisdiction: 'Federal',
    summary: 'Sistemas de proteção contra quedas (SPQC), guarda-corpos provisórios de periferia, plataformas e andaimes.',
    dateAdded: '2026-01-20',
    active: true,
    sourceType: 'built_in',
    pageCount: 74,
    content: `[NORMA REGULAMENTADORA NR-18 - MINISTÉRIO DO TRABALHO E EMPREGO]

ITEM 18.9 - MEDIDAS DE PROTEÇÃO CONTRA QUEDAS DE ALTURA
18.9.1 É obrigatória a instalação de proteção coletiva onde houver risco de queda de trabalhadores ou de projeção de materiais a partir de 2,00 m de desnível.
18.9.4.1 O sistema de guarda-corpo e rodapé de periferia de lajes e vãos abertos deve possuir:
  a) Travessão superior rígido com altura de 1,20 m a partir do nível de trabalho;
  b) Travessão intermediário rígido posicionado a 0,70 m de altura;
  c) Rodapé rígido com altura mínima de 0,15 m junto à borda do piso;
  d) Vãos preenchidos com tela ou dispositivo que impeça a projeção de ferramentas e a passagem de pessoas.
18.9.4.2 O sistema de guarda-corpo deve resistir a uma força pontual horizontal de no mínimo 90 daN (aproximadamente 90 kgf) aplicada no travessão superior sem deformação permanente prejudicial.

ITEM 18.9.6 - PLATAFORMAS DE PROTEÇÃO (BANDEJAS)
18.9.6.1 Em edifícios com mais de 4 pavimentos ou altura equivalente a 12 m, é obrigatória a instalação de plataforma principal de proteção (bandeja principal) na 1ª laje, projetando-se no mínimo 2,50 m horizontalmente com complemento inclinado de 0,80 m a 45 graus.
18.9.6.2 Devem ser instaladas plataformas secundárias a cada 3 lajes, com projeção horizontal mínima de 1,40 m e complemento inclinado de 0,80 m.`
  },
  {
    id: 'norma-nbr-14718',
    title: 'ABNT NBR 14718:2019 - Guarda-corpos para edificações - Requisitos e métodos de ensaio',
    code: 'NBR 14718:2019',
    category: 'estrutural',
    jurisdiction: 'ABNT',
    summary: 'Exigências de altura (1,10m), vãos livres entre perfis (máximo 11cm), resistência mecânica e segurança contra quedas.',
    dateAdded: '2026-01-20',
    active: true,
    sourceType: 'built_in',
    pageCount: 38,
    content: `[ABNT NBR 14718:2019 - GUARDA-CORPOS PARA EDIFICAÇÕES]

SEÇÃO 4 - REQUISITOS GERAIS DE DIMENSIONAMENTO E SEGURANÇA
4.1 Altura mínima de proteção:
4.1.1 A altura mínima do guarda-corpo em relação ao piso acabado de sacadas, varandas, escadas, rampas e mezaninos deve ser de no mínimo 1.100 mm (1,10 m), medida perpendicularmente a partir da superfície transitável.
4.1.2 Caso exista mureta ou peitoril de alvenaria com largura superior a 100 mm (10 cm) que possa ser usada como degrau de escalada por crianças, a altura de 1,10 m deve ser medida a partir do topo dessa mureta.

4.2 Vãos e espaçamentos máximos:
4.2.1 O espaçamento entre perfis verticais do guarda-corpo (barras, balaústres ou piquetes) não pode ultrapassar 110 mm (11 cm), de modo a impedir a passagem de uma esfera de 110 mm de diâmetro (representativa do tronco/cabeça infantil).
4.2.2 A folga inferior entre o piso acabado e o perfil inferior do guarda-corpo deve ser de no máximo 50 mm (5 cm).
4.2.3 São estritamente proibidos perfis horizontais dispostos como escada na faixa entre 100 mm e 450 mm do piso acabado, para impedir a escalada infantil acidental.`
  },
  {
    id: 'norma-codigo-civil-vizinhanca',
    title: 'Código Civil Brasileiro (Lei nº 10.406/2002) - Direito de Vizinhança e do Direito de Construir',
    code: 'Código Civil (Arts. 1.299 a 1.313)',
    category: 'codigo_obras',
    jurisdiction: 'Federal',
    summary: 'Regras legais sobre aberturas a menos de 1,5m de divisa, janelas de visão perpendicular e oblíqua, e água pluvial.',
    dateAdded: '2026-02-01',
    active: true,
    sourceType: 'built_in',
    pageCount: 14,
    content: `[CÓDIGO CIVIL BRASILEIRO - LEI Nº 10.406/2002]
LIVRO III - DO DIREITO DAS COISAS | CAPÍTULO V - DOS DIREITOS DE VIZINHANÇA | SEÇÃO VII - DO DIREITO DE CONSTRUIR

Art. 1.299. O proprietário pode levantar em seu terreno as construções que lhe aprouver, salvo o direito dos vizinhos e os regulamentos administrativos.

Art. 1.301. É defeso abrir janelas, ou fazer eirado, terraço ou varanda, a menos de metro e meio do terreno vizinho.
§ 1º As janelas cuja visão não incida sobre a linha divisória, bem como as perpendiculares, não poderão ser abertas a menos de setenta e cinco centímetros (0,75 m).
§ 2º As disposições deste artigo não abrangem as aberturas para luz ou ventilação, não maiores de dez centímetros de largura sobre vinte de comprimento e construídas a mais de dois metros de altura de cada piso.

Art. 1.302. O proprietário pode, no lapso de ano e dia após a conclusão da obra, exigir que se desfaça janela, sacada, terraço ou goteira sobre o seu prédio; escoado o prazo, não poderá edificar de maneira a prejudicar a claridade do vizinho.

Art. 1.300. O edificador deve construir de maneira que o seu prédio não despeje águas, diretamente, sobre o prédio vizinho.`
  },
  {
    id: 'norma-nbr-15575',
    title: 'ABNT NBR 15575:2021 - Edificações habitacionais - Desempenho (Norma de Desempenho)',
    code: 'NBR 15575',
    category: 'desempenho',
    jurisdiction: 'ABNT',
    summary: 'Requisitos de segurança estrutural, desempenho térmico, lumínico, acústico, durabilidade e vida útil de projeto (VUP).',
    dateAdded: '2026-02-05',
    active: true,
    sourceType: 'built_in',
    pageCount: 210,
    content: `[ABNT NBR 15575 - NORMA DE DESEMPENHO DE EDIFICAÇÕES HABITACIONAIS]

PARTE 1 - REQUISITOS GERAIS E VIDA ÚTIL DE PROJETO (VUP)
Tabela 1 - Vida Útil de Projeto mínima exigida:
  - Estrutura principal: VUP mínima de 50 anos;
  - Vedações verticais externas (fachadas e alvenarias): VUP mínima de 40 anos;
  - Vedações verticais internas: VUP mínima de 20 anos;
  - Cobertura (telhado/laje impermeabilizada): VUP mínima de 20 anos;
  - Pisos internos: VUP mínima de 13 anos;
  - Instalações hidrossanitárias embutidas: VUP mínima de 20 anos.

PARTE 3 - SISTEMAS DE VEDAÇÕES VERTICAIS (PAREDES) E ACÚSTICA
Critérios de Isolamento Acústico entre unidades autônomas distintas:
  - Parede de geminação entre salas de unidades diferentes: Diferença padronizada de nível ponderada (DnT,w) mínima de 45 dB;
  - Parede cega entre dormitório e dormitório de outra unidade: DnT,w mínima de 45 dB (mínimo obrigatório) e 50 dB (desempenho intermediário);
  - Parede cega entre dormitório e área comum de circulação: DnT,w mínima de 40 dB.`
  }
];
