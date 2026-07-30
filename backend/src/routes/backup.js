const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/backup
router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const [inst, memb, membInst, membIndisp, louv, tons, cult, rep, repItens, esc] = await Promise.all([
      client.query('SELECT * FROM instrumentos ORDER BY id'),
      client.query('SELECT * FROM membros ORDER BY id'),
      client.query('SELECT * FROM membro_instrumentos ORDER BY id'),
      client.query('SELECT * FROM membro_indisponibilidade ORDER BY id'),
      client.query('SELECT id,titulo,artista,tom,bpm,compasso,tipo,tags,letra,cifra_url,cifra_texto,youtube_url,criado_em FROM louvores ORDER BY id'),
      client.query('SELECT * FROM louvor_tons_vocalista ORDER BY id'),
      client.query('SELECT * FROM cultos ORDER BY id'),
      client.query('SELECT * FROM repertorios ORDER BY id'),
      client.query('SELECT * FROM repertorio_itens ORDER BY id'),
      client.query('SELECT id,culto_id,membro_id,instrumento_id,is_vocal,confirmado,confirmado_em,convidado_nome,convidado_instrumento,convidado_vocal,instrumento_override FROM escalas ORDER BY id'),
    ]);

    res.json({
      versao: '1.0',
      exportado_em: new Date().toISOString(),
      instrumentos: inst.rows,
      membros: memb.rows,
      membro_instrumentos: membInst.rows,
      membro_indisponibilidade: membIndisp.rows,
      louvores: louv.rows,
      louvor_tons_vocalista: tons.rows,
      cultos: cult.rows,
      repertorios: rep.rows,
      repertorio_itens: repItens.rows,
      escalas: esc.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar backup' });
  } finally {
    client.release();
  }
});

// POST /api/backup/restore
router.post('/restore', async (req, res) => {
  const data = req.body;
  if (!data?.versao) return res.status(400).json({ erro: 'Arquivo de backup inválido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Apagar em ordem reversa de foreign keys
    await client.query('DELETE FROM louvor_historico');
    await client.query('DELETE FROM escalas');
    await client.query('DELETE FROM repertorio_itens');
    await client.query('DELETE FROM repertorios');
    await client.query('DELETE FROM cultos');
    await client.query('DELETE FROM louvor_tons_vocalista');
    await client.query('DELETE FROM louvores');
    await client.query('DELETE FROM membro_indisponibilidade');
    await client.query('DELETE FROM membro_instrumentos');
    await client.query('DELETE FROM membros');
    await client.query('DELETE FROM instrumentos');

    for (const r of (data.instrumentos || [])) {
      await client.query('INSERT INTO instrumentos (id,nome,icone) VALUES ($1,$2,$3)', [r.id, r.nome, r.icone]);
    }
    for (const r of (data.membros || [])) {
      await client.query(
        `INSERT INTO membros (id,nome,telefone,email,foto_url,is_vocal,tipo,ativo,criado_em) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [r.id, r.nome, r.telefone, r.email, r.foto_url, r.is_vocal, r.tipo, r.ativo, r.criado_em]
      );
    }
    for (const r of (data.membro_instrumentos || [])) {
      await client.query(
        'INSERT INTO membro_instrumentos (id,membro_id,instrumento_id,ordem) VALUES ($1,$2,$3,$4)',
        [r.id, r.membro_id, r.instrumento_id, r.ordem]
      );
    }
    for (const r of (data.membro_indisponibilidade || [])) {
      await client.query(
        'INSERT INTO membro_indisponibilidade (id,membro_id,data_inicio,data_fim,motivo,criado_em) VALUES ($1,$2,$3,$4,$5,$6)',
        [r.id, r.membro_id, r.data_inicio, r.data_fim, r.motivo, r.criado_em]
      );
    }
    for (const r of (data.louvores || [])) {
      await client.query(
        `INSERT INTO louvores (id,titulo,artista,tom,bpm,compasso,tipo,tags,letra,cifra_url,cifra_texto,youtube_url,criado_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [r.id, r.titulo, r.artista, r.tom, r.bpm, r.compasso, r.tipo, r.tags, r.letra, r.cifra_url, r.cifra_texto, r.youtube_url, r.criado_em]
      );
    }
    for (const r of (data.louvor_tons_vocalista || [])) {
      await client.query(
        'INSERT INTO louvor_tons_vocalista (id,louvor_id,membro_id,tom,observacao) VALUES ($1,$2,$3,$4,$5)',
        [r.id, r.louvor_id, r.membro_id, r.tom, r.observacao]
      );
    }
    for (const r of (data.cultos || [])) {
      await client.query(
        `INSERT INTO cultos (id,nome,data_hora,local,descricao,observacoes,status,criado_por,criado_em) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [r.id, r.nome, r.data_hora, r.local, r.descricao, r.observacoes, r.status, r.criado_por, r.criado_em]
      );
    }
    for (const r of (data.repertorios || [])) {
      await client.query(
        'INSERT INTO repertorios (id,culto_id,criado_por,criado_em) VALUES ($1,$2,$3,$4)',
        [r.id, r.culto_id, r.criado_por, r.criado_em]
      );
    }
    for (const r of (data.repertorio_itens || [])) {
      await client.query(
        `INSERT INTO repertorio_itens (id,repertorio_id,tipo,louvor_id,descricao,posicao,tom_culto,duracao_min,observacao) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [r.id, r.repertorio_id, r.tipo, r.louvor_id, r.descricao, r.posicao, r.tom_culto, r.duracao_min, r.observacao]
      );
    }
    for (const r of (data.escalas || [])) {
      await client.query(
        `INSERT INTO escalas (id,culto_id,membro_id,instrumento_id,is_vocal,confirmado,confirmado_em,convidado_nome,convidado_instrumento,convidado_vocal,instrumento_override)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [r.id, r.culto_id, r.membro_id, r.instrumento_id, r.is_vocal, r.confirmado, r.confirmado_em, r.convidado_nome, r.convidado_instrumento, r.convidado_vocal, r.instrumento_override || null]
      );
    }

    // Resetar sequences
    const tables = ['instrumentos','membros','membro_instrumentos','membro_indisponibilidade','louvores','louvor_tons_vocalista','cultos','repertorios','repertorio_itens','escalas'];
    for (const t of tables) {
      await client.query(`SELECT setval('${t}_id_seq', COALESCE((SELECT MAX(id) FROM ${t}), 1))`);
    }

    await client.query('COMMIT');
    res.json({ mensagem: 'Restore concluído com sucesso' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ erro: 'Erro ao restaurar: ' + err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
