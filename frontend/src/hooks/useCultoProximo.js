import { useState, useEffect } from 'react';
import { cultos as cultosApi } from '../services/api';

export function mesChave(isoStr) {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function mesLabel(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/**
 * Hook compartilhado para filtrar cultos futuros e auto-selecionar o mais próximo.
 *
 * Retorna:
 *   cultosAll        — todos os cultos futuros (agendados, data >= hoje)
 *   cultosFiltrados  — cultos do mês selecionado
 *   mesesDisponiveis — lista de chaves "YYYY-MM" dos meses com cultos
 *   cultoId          — id selecionado (string)
 *   setCultoId       — setter
 *   mesSelecionado   — chave "YYYY-MM" do mês ativo
 *   setMesSelecionado — setter (também limpa cultoId)
 *   cultoAtual       — objeto do culto selecionado (ou undefined)
 *   carregandoCultos — true enquanto a lista está sendo carregada
 */
export function useCultoProximo(initialCultoId = null) {
  const [cultosAll, setCultosAll] = useState([]);
  const [cultoId, setCultoId] = useState(initialCultoId ? String(initialCultoId) : '');
  const [mesSelecionado, setMesSelecionadoInterno] = useState('');
  const [carregandoCultos, setCarregandoCultos] = useState(true);

  useEffect(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    cultosApi.listar()
      .then(lista => {
        // Inclui TODOS os cultos (agendados e realizados) ordenados por data
        const todos = lista.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
        setCultosAll(todos);

        // Auto-seleciona o próximo apenas se ainda não há nenhum culto selecionado
        const proximo = todos.find(c => c.status === 'agendado' && new Date(c.data_hora) >= hoje);
        if (proximo) {
          setMesSelecionadoInterno(mesChave(proximo.data_hora));
          // Forma funcional: só define se o valor atual ainda estiver vazio
          setCultoId(prev => prev || String(proximo.id));
        }
      })
      .catch(console.error)
      .finally(() => setCarregandoCultos(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mesesDisponiveis = [...new Set(cultosAll.map(c => mesChave(c.data_hora)))];

  const cultosFiltrados = mesSelecionado
    ? cultosAll.filter(c => mesChave(c.data_hora) === mesSelecionado)
    : cultosAll;

  const cultoAtual = cultosAll.find(c => c.id === parseInt(cultoId));

  const setMesSelecionado = (chave) => {
    setMesSelecionadoInterno(chave);
    setCultoId('');
  };

  return {
    cultosAll,
    cultosFiltrados,
    mesesDisponiveis,
    cultoId,
    setCultoId,
    mesSelecionado,
    setMesSelecionado,
    cultoAtual,
    carregandoCultos,
  };
}
