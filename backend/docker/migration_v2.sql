-- ═══════════════════════════════════════════════════════════════
-- Migration v2 — aplicar em banco existente
-- 1. Renomear visitante → convidado na tabela escalas
-- 2. Atualizar CHECK em membros.tipo
-- 3. Remover coluna capo de louvores e louvor_tons_vocalista
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Renomear colunas em escalas ────────────────────────────
ALTER TABLE escalas RENAME COLUMN visitante_nome        TO convidado_nome;
ALTER TABLE escalas RENAME COLUMN visitante_instrumento TO convidado_instrumento;
ALTER TABLE escalas RENAME COLUMN visitante_vocal       TO convidado_vocal;

ALTER TABLE escalas DROP CONSTRAINT IF EXISTS escala_membro_ou_visitante;
ALTER TABLE escalas ADD CONSTRAINT escala_membro_ou_convidado CHECK (
  (membro_id IS NOT NULL) OR (convidado_nome IS NOT NULL)
);

-- ── 2. Atualizar CHECK em membros.tipo ────────────────────────
ALTER TABLE membros DROP CONSTRAINT IF EXISTS membros_tipo_check;
ALTER TABLE membros ADD CONSTRAINT membros_tipo_check
  CHECK (tipo IN ('fixo','convidado'));
UPDATE membros SET tipo = 'convidado' WHERE tipo = 'visitante';

-- ── 3. Remover campo capo ─────────────────────────────────────
ALTER TABLE louvores              DROP COLUMN IF EXISTS capo;
ALTER TABLE louvor_tons_vocalista DROP COLUMN IF EXISTS capo;

COMMIT;
