import React from 'react';
import { Compass, Scale, Ruler, HardHat, ShieldAlert, FileText, ArrowRight } from 'lucide-react';

interface SamplePromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const SAMPLE_PROMPTS = [
  {
    title: 'Inclinação Máxima de Rampas',
    norm: 'NBR 9050:2020',
    prompt: 'Qual é a inclinação máxima permitida para uma rampa de acesso em nova construção e quais são os limites de desnível e patamares obrigatórios?',
    icon: <Ruler className="w-4 h-4 text-blue-700" />,
  },
  {
    title: 'Recuo de Janela na Divisa',
    norm: 'Código Civil Art. 1.301',
    prompt: 'Posso construir uma janela ou varanda a menos de 1,50 metro da divisa do terreno vizinho? Quais as exceções legais e prazos de contestação?',
    icon: <Scale className="w-4 h-4 text-amber-700" />,
  },
  {
    title: 'Dimensionamento de Escadas',
    norm: 'Fórmula de Blondel & NBR 9050',
    prompt: 'Quais são os limites obrigatórios de piso e espelho de escadas pela fórmula de Blondel e quais as exigências de corrimão duplo?',
    icon: <Compass className="w-4 h-4 text-emerald-700" />,
  },
  {
    title: 'Guarda-Corpo de Varanda',
    norm: 'NBR 14718:2019',
    prompt: 'Qual a altura mínima exigida para guarda-corpos em sacadas e varandas e qual o vão máximo permitido entre as barras verticais?',
    icon: <ShieldAlert className="w-4 h-4 text-purple-700" />,
  },
  {
    title: 'Proteção de Periferia na Obra',
    norm: 'NR-18 (MTE)',
    prompt: 'Quais as especificações de guarda-corpo de periferia de lajes e bandejas de proteção exigidas pela NR-18 em canteiros de obras?',
    icon: <HardHat className="w-4 h-4 text-orange-700" />,
  },
  {
    title: 'Iluminação e Ventilação Mínima',
    norm: 'Código de Obras Municipal',
    prompt: 'Qual a proporção mínima de abertura de janelas para ventilação e iluminação natural em quartos e salas residenciais segundo o Código de Obras?',
    icon: <FileText className="w-4 h-4 text-teal-700" />,
  },
];

export const SamplePrompts: React.FC<SamplePromptsProps> = ({ onSelectPrompt }) => {
  return (
    <div className="my-4 sm:my-8 max-w-4xl mx-auto px-1 sm:px-4 w-full">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight">
          Perguntas Frequentes e Consultas Normativas
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl mx-auto">
          Selecione uma consulta técnica imediata ou digite sua dúvida e envie imagens de obras
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {SAMPLE_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(item.prompt)}
            className="group flex flex-col justify-between p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all text-left cursor-pointer w-full"
          >
            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="p-1.5 sm:p-2 rounded-lg bg-slate-100 group-hover:bg-blue-50 transition-colors shrink-0">
                  {item.icon}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate">
                  {item.norm}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors leading-snug">
                {item.title}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {item.prompt}
              </p>
            </div>

            <div className="mt-2.5 sm:mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-semibold text-blue-900 group-hover:translate-x-0.5 transition-transform">
              <span>Consultar Legislação</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
