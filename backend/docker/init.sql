-- ── USUÁRIOS DO SISTEMA ────────────────────────────────────────
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'visualizador'
    CHECK (role IN ('admin','visualizador')),
  ativo BOOLEAN DEFAULT true,
  refresh_token TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ── MEMBROS DA EQUIPE ──────────────────────────────────────────
CREATE TABLE membros (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(150),
  foto_url TEXT,
  is_vocal BOOLEAN DEFAULT false,
  tipo VARCHAR(20) DEFAULT 'fixo'
    CHECK (tipo IN ('fixo','convidado')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ── INSTRUMENTOS ───────────────────────────────────────────────
CREATE TABLE instrumentos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(50) UNIQUE NOT NULL,
  icone VARCHAR(10) DEFAULT '🎵'
);

-- ── MEMBRO x INSTRUMENTOS (ordem 1=principal, 2, 3) ───────────
CREATE TABLE membro_instrumentos (
  id SERIAL PRIMARY KEY,
  membro_id INT NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
  instrumento_id INT NOT NULL REFERENCES instrumentos(id),
  ordem INT NOT NULL CHECK (ordem IN (1,2,3)),
  UNIQUE(membro_id, ordem)
);

-- ── LOUVORES ───────────────────────────────────────────────────
CREATE TABLE louvores (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  artista VARCHAR(150),
  tom VARCHAR(10),
  bpm INT,
  compasso VARCHAR(10) DEFAULT '4/4',
  tipo VARCHAR(30)
    CHECK (tipo IN ('Adoração','Louvor','Comunhão')),
  tags TEXT[],
  letra TEXT,
  cifra_url TEXT,
  youtube_url TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  busca_fts TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('portuguese',
      coalesce(titulo,'') || ' ' ||
      coalesce(artista,'') || ' ' ||
      coalesce(letra,''))
  ) STORED
);

CREATE INDEX idx_louvores_fts ON louvores USING GIN(busca_fts);

-- ── TONS POR VOCALISTA ─────────────────────────────────────────
CREATE TABLE louvor_tons_vocalista (
  id SERIAL PRIMARY KEY,
  louvor_id INT NOT NULL REFERENCES louvores(id) ON DELETE CASCADE,
  membro_id INT NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
  tom VARCHAR(10) NOT NULL,
  observacao TEXT,
  UNIQUE(louvor_id, membro_id)
);

-- ── CULTOS ─────────────────────────────────────────────────────
CREATE TABLE cultos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  data_hora TIMESTAMP NOT NULL,
  local VARCHAR(150),
  descricao TEXT,
  observacoes TEXT,
  status VARCHAR(20) DEFAULT 'agendado'
    CHECK (status IN ('agendado','realizado','cancelado')),
  criado_por INT REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ── REPERTÓRIOS ────────────────────────────────────────────────
CREATE TABLE repertorios (
  id SERIAL PRIMARY KEY,
  culto_id INT UNIQUE NOT NULL REFERENCES cultos(id) ON DELETE CASCADE,
  criado_por INT REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ── ITENS DO REPERTÓRIO ────────────────────────────────────────
CREATE TABLE repertorio_itens (
  id SERIAL PRIMARY KEY,
  repertorio_id INT NOT NULL REFERENCES repertorios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'musica'
    CHECK (tipo IN ('musica','oracao','palavra','ofertorio','comunhao','aviso','outro')),
  louvor_id INT REFERENCES louvores(id),
  descricao VARCHAR(200),
  posicao INT NOT NULL,
  tom_culto VARCHAR(10),
  duracao_min INT,
  observacao TEXT,
  UNIQUE(repertorio_id, posicao)
);

-- ── ESCALA ─────────────────────────────────────────────────────
CREATE TABLE escalas (
  id SERIAL PRIMARY KEY,
  culto_id INT NOT NULL REFERENCES cultos(id) ON DELETE CASCADE,
  membro_id INT REFERENCES membros(id),
  instrumento_id INT REFERENCES instrumentos(id),
  instrumento_override TEXT,
  is_vocal BOOLEAN DEFAULT false,
  confirmado BOOLEAN DEFAULT false,
  confirmado_em TIMESTAMP,
  convidado_nome VARCHAR(100),
  convidado_instrumento VARCHAR(50),
  convidado_vocal BOOLEAN DEFAULT false,
  CONSTRAINT escala_membro_ou_convidado CHECK (
    (membro_id IS NOT NULL) OR (convidado_nome IS NOT NULL)
  ),
  UNIQUE(culto_id, membro_id)
);

-- ── DISPONIBILIDADE DOS MEMBROS ────────────────────────────────
CREATE TABLE membro_indisponibilidade (
  id SERIAL PRIMARY KEY,
  membro_id INT NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  motivo VARCHAR(200),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ── LINKS TEMPORÁRIOS ─────────────────────────────────────────
CREATE TABLE links_temporarios (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) UNIQUE NOT NULL,
  culto_id INT NOT NULL REFERENCES cultos(id) ON DELETE CASCADE,
  descricao VARCHAR(100),
  expira_em TIMESTAMP NOT NULL,
  acessos INT DEFAULT 0,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ── HISTÓRICO DE USO DOS LOUVORES ─────────────────────────────
CREATE TABLE louvor_historico (
  id SERIAL PRIMARY KEY,
  louvor_id INT NOT NULL REFERENCES louvores(id),
  culto_id INT NOT NULL REFERENCES cultos(id),
  tom_usado VARCHAR(10),
  data_culto TIMESTAMP NOT NULL,
  UNIQUE(louvor_id, culto_id)
);

-- ════════════════════════════════════════════════════════════════
-- SEED INICIAL
-- ════════════════════════════════════════════════════════════════

INSERT INTO instrumentos (nome, icone) VALUES
  ('Violão','🎸'), ('Guitarra','🎸'), ('Baixo','🎸'),
  ('Teclado','🎹'), ('Bateria','🥁'), ('Cajón','🥁'),
  ('Flauta','🎺'), ('Trompete','🎺'), ('Violino','🎻'),
  ('Saxofone','🎷'), ('Pandeiro','🪘'), ('Sanfona','🪗')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO membros (nome, telefone, is_vocal, tipo) VALUES
  ('Elano',    '(85) 99001-0001', true,  'fixo'),
  ('Otávio',   '(85) 99001-0002', false, 'fixo'),
  ('Dênio',    '(85) 99001-0003', false, 'fixo'),
  ('Cesar',    '(85) 99001-0004', true,  'fixo'),
  ('Guilherme','(85) 99001-0005', false, 'fixo'),
  ('Roberto',  '(85) 99001-0006', true,  'fixo');

INSERT INTO membro_instrumentos (membro_id, instrumento_id, ordem) VALUES
  (1,(SELECT id FROM instrumentos WHERE nome='Guitarra'),1),
  (1,(SELECT id FROM instrumentos WHERE nome='Violão'),  2),
  (2,(SELECT id FROM instrumentos WHERE nome='Guitarra'),1),
  (3,(SELECT id FROM instrumentos WHERE nome='Bateria'), 1),
  (3,(SELECT id FROM instrumentos WHERE nome='Cajón'),   2),
  (4,(SELECT id FROM instrumentos WHERE nome='Violão'),  1),
  (4,(SELECT id FROM instrumentos WHERE nome='Teclado'), 2),
  (4,(SELECT id FROM instrumentos WHERE nome='Baixo'),   3),
  (5,(SELECT id FROM instrumentos WHERE nome='Baixo'),   1),
  (6,(SELECT id FROM instrumentos WHERE nome='Violão'),  1),
  (6,(SELECT id FROM instrumentos WHERE nome='Guitarra'),2);

INSERT INTO louvores
  (titulo, artista, tom, bpm, compasso, tipo, letra, youtube_url) VALUES
(
  'Ninguém Explica Deus','Preto no Branco','G',72,'4/4','Adoração',
  '[Verso 1]
Há mistérios que eu não consigo entender
Há perguntas que não têm resposta aqui
Mas eu sei em quem eu crei
E confio que Ele é fiel

[Pré-Refrão]
Não há explicação pra tanta graça
Não há teoria que justifique
O amor que tens por mim

[Refrão]
Ninguém explica Deus
Ninguém explica Deus
Ninguém explica o que Ele faz
Ninguém explica Deus

[Verso 2]
Vi milagres que não têm explicação
Vi desertos que Ele fez jardim
Quando estava no fim
Ele fez de novo em mim

[Ponte]
Tudo que eu sei é que Ele é bom
Tudo que eu sei é que Ele é real
Tudo que eu sei é que Ele me amou
E isso me basta, isso me basta

[Refrão Final]
Ninguém explica Deus
Ninguém explica Deus
Ninguém explica o que Ele faz
Ninguém explica Deus',
  'https://www.youtube.com/watch?v=Xk2UDCiPrOs'
);

INSERT INTO louvor_tons_vocalista (louvor_id, membro_id, tom) VALUES
  (1, 1, 'G'),
  (1, 4, 'E'),
  (1, 6, 'F#');
