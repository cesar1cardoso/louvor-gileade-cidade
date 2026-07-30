const BASE_URL = import.meta.env.VITE_API_URL || '';

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function request(method, path, body, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const config = {
    method,
    headers,
    credentials: 'include',
    ...options,
  };

  if (body) config.body = JSON.stringify(body);

  let res = await fetch(`${BASE_URL}${path}`, config);

  // Tentar refresh automático se 401 (exceto nas próprias rotas de auth)
  if (res.status === 401 && path !== '/api/auth/login' && path !== '/api/auth/refresh') {

    // Lock: se já tem um refresh em andamento, aguarda o mesmo
    if (!refreshPromise) {
      refreshPromise = fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      }).finally(() => {
        refreshPromise = null; // libera o lock ao terminar
      });
    }

    const refreshRes = await refreshPromise;

    if (refreshRes.ok) {
      const data = await refreshRes.clone().json();
      setAccessToken(data.accessToken);
      headers['Authorization'] = `Bearer ${data.accessToken}`;
      res = await fetch(`${BASE_URL}${path}`, { ...config, headers });
    } else {
      setAccessToken(null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ erro: 'Erro desconhecido' }));
    throw new Error(err.erro || 'Erro na requisição');
  }

  if (res.status === 204) return null;
  return res.json();
}

// Auth
export const auth = {
  login: (email, senha) => request('POST', '/api/auth/login', { email, senha }),
  refresh: () => request('POST', '/api/auth/refresh'),
  logout: () => request('POST', '/api/auth/logout'),
};

// Membros
export const membros = {
  listar: () => request('GET', '/api/membros'),
  criar: (dados) => request('POST', '/api/membros', dados),
  buscar: (id) => request('GET', `/api/membros/${id}`),
  atualizar: (id, dados) => request('PATCH', `/api/membros/${id}`, dados),
  inativar: (id) => request('PATCH', `/api/membros/${id}/inativar`),
  repertorio: (id) => request('GET', `/api/membros/${id}/repertorio`),
  disponibilidade: (id) => request('GET', `/api/membros/${id}/disponibilidade`),
  adicionarIndisponibilidade: (id, dados) => request('POST', `/api/membros/${id}/disponibilidade`, dados),
  removerIndisponibilidade: (id, dId) => request('DELETE', `/api/membros/${id}/disponibilidade/${dId}`),
  indisponibilidadesData: (data) => request('GET', `/api/membros/indisponibilidades-data?data=${data}`),
};

// Louvores
export const louvores = {
  listar: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/api/louvores${q ? '?' + q : ''}`);
  },
  criar: (dados) => request('POST', '/api/louvores', dados),
  buscar: (id) => request('GET', `/api/louvores/${id}`),
  atualizar: (id, dados) => request('PATCH', `/api/louvores/${id}`, dados),
  atualizarLetra: (id, letra) => request('PATCH', `/api/louvores/${id}/letra`, { letra }),
  atualizarYoutube: (id, youtube_url) => request('PATCH', `/api/louvores/${id}/youtube`, { youtube_url }),
  remover: (id) => request('DELETE', `/api/louvores/${id}`),
  tons: (id) => request('GET', `/api/louvores/${id}/tons`),
  salvarTom: (id, dados) => request('POST', `/api/louvores/${id}/tons`, dados),
  removerTom: (id, membroId) => request('DELETE', `/api/louvores/${id}/tons/${membroId}`),
  atualizarCifra: (id, dados) => request('PATCH', `/api/louvores/${id}/cifra`, dados),
  historico: (id) => request('GET', `/api/louvores/${id}/historico`),
  maisUsadas: () => request('GET', '/api/louvores/stats/mais-usadas'),
  semUso: () => request('GET', '/api/louvores/stats/sem-uso'),
};

// Cultos
export const cultos = {
  listar: () => request('GET', '/api/cultos'),
  proximos: () => request('GET', '/api/cultos/proximos'),
  criar: (dados) => request('POST', '/api/cultos', dados),
  buscar: (id) => request('GET', `/api/cultos/${id}`),
  atualizar: (id, dados) => request('PATCH', `/api/cultos/${id}`, dados),
  deletar: (id) => request('DELETE', `/api/cultos/${id}`),
  realizar: (id) => request('PATCH', `/api/cultos/${id}/realizar`),
  linkVisitante: (id) => request('GET', `/api/cultos/${id}/link-visitante`),
};

// Repertórios
export const repertorios = {
  criar: (culto_id) => request('POST', '/api/repertorios', { culto_id }),
  buscar: (cultoId) => request('GET', `/api/repertorios/${cultoId}`),
  adicionarItem: (id, dados) => request('POST', `/api/repertorios/${id}/itens`, dados),
  atualizarItem: (id, itemId, dados) => request('PATCH', `/api/repertorios/${id}/itens/${itemId}`, dados),
  adicionarLote: (id, louvores) => request('POST', `/api/repertorios/${id}/itens/batch`, { louvores }),
  reordenar: (id, ordem) => request('PATCH', `/api/repertorios/${id}/itens`, { ordem }),
  removerItem: (id, itemId) => request('DELETE', `/api/repertorios/${id}/itens/${itemId}`),
};

// Escalas
export const escalas = {
  buscar: (cultoId) => request('GET', `/api/escalas/${cultoId}`),
  adicionar: (dados) => request('POST', '/api/escalas', dados),
  adicionarConvidado: (dados) => request('POST', '/api/escalas/convidado', dados),
  confirmar: (id) => request('PATCH', `/api/escalas/${id}/confirmar`),
  atualizarInstrumento: (id, instrumento_override) => request('PATCH', `/api/escalas/${id}/instrumento`, { instrumento_override }),
  remover: (id) => request('DELETE', `/api/escalas/${id}`),
};

// Links temporários
export const linksTemp = {
  criar: (dados) => request('POST', '/api/links-temporarios', dados),
  validar: (token) => request('GET', `/api/links-temporarios/validar/${token}`),
  revogar: (id) => request('DELETE', `/api/links-temporarios/${id}`),
  listarPorCulto: (cultoId) => request('GET', `/api/links-temporarios/culto/${cultoId}`),
};

// Público
export const publico = {
  culto: (token) => fetch(`${BASE_URL}/public/culto/${token}`).then(r => r.json()),
};

// Instrumentos
export const instrumentos = {
  listar: () => request('GET', '/api/membros/instrumentos'),
};

// Usuários (somente admin)
export const usuarios = {
  listar: () => request('GET', '/api/usuarios'),
  criar: (dados) => request('POST', '/api/usuarios', dados),
  atualizar: (id, dados) => request('PATCH', `/api/usuarios/${id}`, dados),
  resetSenha: (id, senha) => request('POST', `/api/usuarios/${id}/reset-senha`, { senha }),
};

// Estatísticas
export const estatisticas = {
  louvores: () => request('GET', '/api/estatisticas/louvores'),
};

// Backup / Restore
export const backup = {
  exportar: () => request('GET', '/api/backup'),
  importar: (dados) => request('POST', '/api/backup/restore', dados),
};
