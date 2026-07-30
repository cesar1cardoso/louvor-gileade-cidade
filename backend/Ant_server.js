require('dotenv').config();

// ── Validação de variáveis obrigatórias ──────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET não definido. Encerrando.');
  process.exit(1);
}
if (!process.env.JWT_REFRESH_SECRET) {
  console.error('❌ JWT_REFRESH_SECRET não definido. Encerrando.');
  process.exit(1);
}

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const pool       = require('./src/config/database');
const autoSeed   = require('./src/scripts/auto-seed');

const authRoutes           = require('./src/routes/auth');
const membrosRoutes        = require('./src/routes/membros');
const louvoresRoutes       = require('./src/routes/louvores');
const cultosRoutes         = require('./src/routes/cultos');
const repertoriosRoutes    = require('./src/routes/repertorios');
const escalasRoutes        = require('./src/routes/escalas');
const linksTemporariosRoutes = require('./src/routes/links-temporarios');
const backupRoutes         = require('./src/routes/backup');
const usuariosRoutes       = require('./src/routes/usuarios');
const estatisticasRoutes   = require('./src/routes/estatisticas');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ── Segurança HTTP (Helmet) ───────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()),
  'http://localhost:5173',
  'http://localhost:3000',
  'http://192.168.0.6:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// ── Rate limiting — rotas de autenticação ─────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: { erro: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// ── Rota pública — acesso visitante por token ─────────────────────────────────
app.get('/public/culto/:token', async (req, res) => {
  try {
    const linkResult = await pool.query(
      `SELECT lt.*, c.id AS culto_id, c.nome AS culto_nome, c.data_hora, c.local
       FROM links_temporarios lt
       JOIN cultos c ON c.id = lt.culto_id
       WHERE lt.token = $1 AND lt.expira_em > NOW()`,
      [req.params.token]
    );

    if (linkResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Link inválido ou expirado' });
    }

    const link    = linkResult.rows[0];
    const cultoId = link.culto_id;

    await pool.query(
      'UPDATE links_temporarios SET acessos = acessos + 1 WHERE token = $1',
      [req.params.token]
    );

    // ── Repertório ────────────────────────────────────────────────────────
    const repertorioResult = await pool.query(`
      SELECT ri.id, ri.posicao, ri.tipo, ri.descricao, ri.tom_culto, ri.louvor_id,
        l.titulo, l.artista, l.tom AS tom_padrao, l.youtube_url, l.cifra_url, l.letra, l.cifra_texto
      FROM repertorios r
      JOIN repertorio_itens ri ON ri.repertorio_id = r.id
      LEFT JOIN louvores l ON l.id = ri.louvor_id
      WHERE r.culto_id = $1
      ORDER BY ri.posicao
    `, [cultoId]);

    // ── Equipe escalada ───────────────────────────────────────────────────
    const escalaResult = await pool.query(`
      SELECT
        COALESCE(m.nome, e.convidado_nome)                        AS nome,
        COALESCE(
          e.instrumento_override,
          i.nome,
          CASE WHEN e.is_vocal OR e.convidado_vocal THEN 'Vocal' END
        )                                                          AS instrumento,
        CASE WHEN e.membro_id IS NULL THEN true ELSE false END    AS convidado,
        e.membro_id,
        e.is_vocal
      FROM escalas e
      LEFT JOIN membros m      ON m.id = e.membro_id
      LEFT JOIN instrumentos i ON i.id = e.instrumento_id
      WHERE e.culto_id = $1
      ORDER BY m.nome NULLS LAST, e.convidado_nome NULLS LAST
    `, [cultoId]);

    // ── Toms dos vocalistas por louvor ────────────────────────────────────
    const vocalistasIds     = escalaResult.rows
      .filter(e => e.is_vocal && e.membro_id)
      .map(e => e.membro_id);
    const primeiroVocalista = escalaResult.rows.find(e => e.is_vocal && e.membro_id);
    const tonsPorLouvor     = {};

    if (vocalistasIds.length > 0) {
      const tomsResult = await pool.query(`
        SELECT ltv.louvor_id, ltv.tom, m.nome AS vocalista_nome
        FROM louvor_tons_vocalista ltv
        JOIN membros m ON m.id = ltv.membro_id
        WHERE ltv.membro_id = ANY($1)
        ORDER BY ltv.louvor_id
      `, [vocalistasIds]);

      tomsResult.rows.forEach(row => {
        if (!tonsPorLouvor[row.louvor_id]) {
          tonsPorLouvor[row.louvor_id] = { tom: row.tom, vocal: row.vocalista_nome };
        }
      });
    }

    // ── Montar resposta ───────────────────────────────────────────────────
    const repertorio = repertorioResult.rows.map(item => {
      const info = item.louvor_id ? tonsPorLouvor[item.louvor_id] : null;
      return {
        id:          item.id,
        posicao:     item.posicao,
        tipo:        item.tipo,
        descricao:   item.descricao,
        louvor_id:   item.louvor_id,
        titulo:      item.titulo,
        artista:     item.artista,
        youtube_url: item.youtube_url,
        cifra_url:   item.cifra_url,
        cifra_texto: item.cifra_texto,
        letra:       item.letra,
        // Tom: prioridade tom_culto → tom do vocalista → tom base do louvor
        tom:         item.tom_culto || info?.tom || item.tom_padrao || null,
        vocal:       info?.vocal    || primeiroVocalista?.nome      || null,
      };
    });

    const equipe = escalaResult.rows.map(e => ({
      nome:        e.nome,
      instrumento: e.instrumento,
      convidado:   e.convidado,
    }));

    res.json({
      culto: {
        id:        cultoId,
        nome:      link.culto_nome,
        data_hora: link.data_hora,
        local:     link.local,
      },
      expira_em: link.expira_em,
      equipe,
      repertorio,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── Rotas autenticadas ────────────────────────────────────────────────────────
app.use('/api/auth',             authRoutes);
app.use('/api/membros',          membrosRoutes);
app.use('/api/louvores',         louvoresRoutes);
app.use('/api/cultos',           cultosRoutes);
app.use('/api/repertorios',      repertoriosRoutes);
app.use('/api/escalas',          escalasRoutes);
app.use('/api/links-temporarios', linksTemporariosRoutes);
app.use('/api/backup',           backupRoutes);
app.use('/api/usuarios',         usuariosRoutes);
app.use('/api/estatisticas',     estatisticasRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Tratamento global de erros ────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    erro: isProd ? 'Erro interno do servidor' : err.message,
  });
});

// ── Inicialização ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  if (!isProd) {
    console.log(`API Louvor Casa Viva rodando na porta ${PORT}`);
  }
  await autoSeed();
});
