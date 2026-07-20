/**
 * Seed das timelines de processos a partir de docs/timelines/timeline-*.md
 * (fonte de verdade do conteúdo — ver docs/timelines/feature-timelines-brief.md).
 *
 * Faz parse do frontmatter YAML e da primeira tabela markdown de fases de cada
 * ficheiro e faz upsert em tl_templates (por `key`) + tl_phases (por
 * `template_id, ordem`). Corre com service role (bypass RLS):
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:timelines
 *   npm run seed:timelines -- --dry-run          # só parse + contagens
 *   npm run seed:timelines -- --dir <pasta>      # pasta alternativa de .md
 *
 * Formato esperado de cada timeline-*.md:
 *
 *   ---
 *   key: civel-cpc
 *   title: Ação declarativa cível (CPC)
 *   area: civel
 *   jurisdicao: PT
 *   base_legal: CPC
 *   versao: "1.0"
 *   ---
 *   ...
 *   | # | Fase | Tipo | Base legal | Prazo | Contagem | Opcional | ⚠️ | Notas |
 *   |---|------|------|-----------|-------|----------|----------|----|-------|
 *   | 1 | Citação do réu | gatilho | art. 219.º CPC | | | | | ... |
 *
 * Cabeçalhos são identificados de forma tolerante (ordem/#, fase/label, tipo,
 * base legal, prazo, contagem, opcional, ⚠️/confirmar, notas); colunas em
 * falta ficam null/false.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ── Env (.env.local > .env > process.env, sem dependência de dotenv) ──
function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}
loadEnvFile(resolve('.env.local'));
loadEnvFile(resolve('.env'));

const DRY_RUN = process.argv.includes('--dry-run');
const dirFlag = process.argv.indexOf('--dir');
const DOCS_DIR = dirFlag > -1 ? resolve(process.argv[dirFlag + 1]) : resolve('docs/timelines');

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_ROLE_KEY)) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios (ou usar --dry-run).');
  process.exit(1);
}

// ── Tipos ──
const TIPOS_VALIDOS = ['gatilho', 'prazo_parte', 'prazo_tribunal', 'marco'] as const;
type Tipo = (typeof TIPOS_VALIDOS)[number];

interface TemplateDoc {
  file: string;
  key: string;
  title: string;
  area: string | null;
  jurisdicao: string | null;
  base_legal: string | null;
  versao: string | null;
  phases: PhaseRow[];
}

interface PhaseRow {
  ordem: number;
  label: string;
  tipo: Tipo;
  base_legal: string | null;
  prazo_dias: number | null;
  contagem: string | null;
  anchor: string | null;
  is_optional: boolean;
  confirmar: boolean;
  notas: string | null;
}

// ── Parse ──
function parseFrontmatter(md: string, file: string): Record<string, string> {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) throw new Error(`${file}: frontmatter YAML (--- ... ---) não encontrado`);
  const out: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) out[kv[1].toLowerCase()] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

/** Normaliza um cabeçalho de coluna para matching tolerante. */
function normHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9#⚠]/gu, '');
}

const HEADER_MAP: Record<string, keyof PhaseRow | 'ordem'> = {
  '#': 'ordem',
  n: 'ordem',
  ordem: 'ordem',
  fase: 'label',
  label: 'label',
  etapa: 'label',
  tipo: 'tipo',
  baselegal: 'base_legal',
  base: 'base_legal',
  prazo: 'prazo_dias',
  prazodias: 'prazo_dias',
  dias: 'prazo_dias',
  contagem: 'contagem',
  anchor: 'anchor',
  ancora: 'anchor',
  opcional: 'is_optional',
  optional: 'is_optional',
  confirmar: 'confirmar',
  validar: 'confirmar',
  notas: 'notas',
  nota: 'notas',
  observacoes: 'notas',
};

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());
}

function parsePhaseTable(md: string, file: string): PhaseRow[] {
  const lines = md.split('\n');
  // Primeira tabela markdown cujo cabeçalho contenha uma coluna de fase/label
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\s*\|.*\|\s*$/.test(lines[i])) continue;
    if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const headers = splitTableRow(lines[i]).map((h) => {
      const n = normHeader(h);
      return HEADER_MAP[n] ?? (n.includes('⚠') ? 'confirmar' : null);
    });
    if (!headers.includes('label')) continue;

    const rows: PhaseRow[] = [];
    for (let j = i + 2; j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j]); j++) {
      const cells = splitTableRow(lines[j]);
      const raw: Partial<Record<string, string>> = {};
      headers.forEach((h, idx) => {
        if (h && cells[idx] !== undefined) raw[h] = cells[idx];
      });

      const label = (raw.label ?? '').trim();
      if (!label) continue;

      const tipoRaw = (raw.tipo ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '_');
      if (!TIPOS_VALIDOS.includes(tipoRaw as Tipo)) {
        throw new Error(
          `${file}: tipo inválido "${raw.tipo}" na fase "${label}" (válidos: ${TIPOS_VALIDOS.join(', ')})`,
        );
      }

      const prazoMatch = (raw.prazo_dias ?? '').match(/\d+/);
      const truthy = (v?: string) =>
        !!v && /⚠|sim|yes|true|x|✓|✔/iu.test(v.trim());

      rows.push({
        ordem: raw.ordem ? parseInt(raw.ordem, 10) : rows.length + 1,
        label,
        tipo: tipoRaw as Tipo,
        base_legal: raw.base_legal?.trim() || null,
        prazo_dias: prazoMatch ? parseInt(prazoMatch[0], 10) : null,
        contagem: raw.contagem?.trim() || null,
        anchor: raw.anchor?.trim() || null,
        is_optional: truthy(raw.is_optional),
        confirmar: truthy(raw.confirmar),
        notas: raw.notas?.trim() || null,
      });
    }
    if (rows.length) return rows;
  }
  throw new Error(`${file}: nenhuma tabela de fases encontrada (cabeçalho com coluna Fase/Label)`);
}

function parseDoc(path: string): TemplateDoc {
  const file = path.split('/').pop()!;
  const md = readFileSync(path, 'utf8');
  const fm = parseFrontmatter(md, file);
  if (!fm.key || !fm.title) throw new Error(`${file}: frontmatter tem de definir "key" e "title"`);
  return {
    file,
    key: fm.key,
    title: fm.title,
    area: fm.area ?? null,
    jurisdicao: fm.jurisdicao ?? null,
    base_legal: fm.base_legal ?? null,
    versao: fm.versao ?? null,
    phases: parsePhaseTable(md, file),
  };
}

// ── Upsert ──
async function main() {
  if (!existsSync(DOCS_DIR)) {
    console.error(`❌ Pasta não encontrada: ${DOCS_DIR}`);
    process.exit(1);
  }
  const files = readdirSync(DOCS_DIR)
    .filter((f) => /^timeline-.*\.md$/.test(f))
    .sort();
  if (files.length === 0) {
    console.error(`❌ Nenhum ficheiro timeline-*.md em ${DOCS_DIR}`);
    process.exit(1);
  }

  const docs = files.map((f) => parseDoc(join(DOCS_DIR, f)));
  for (const d of docs) {
    console.log(`📄 ${d.file} → template "${d.key}" (${d.title}) com ${d.phases.length} fases`);
  }
  if (DRY_RUN) {
    for (const d of docs) {
      console.table(
        d.phases.map((p) => ({
          ordem: p.ordem,
          label: p.label,
          tipo: p.tipo,
          prazo_dias: p.prazo_dias,
          contagem: p.contagem,
          opcional: p.is_optional,
          confirmar: p.confirmar,
        })),
      );
    }
    console.log(`\n✅ Dry-run: ${docs.length} templates, ${docs.reduce((s, d) => s + d.phases.length, 0)} fases. Nada foi escrito.`);
    return;
  }

  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  for (const doc of docs) {
    const { data: tpl, error: tplError } = await supabase
      .from('tl_templates')
      .upsert(
        {
          key: doc.key,
          title: doc.title,
          area: doc.area,
          jurisdicao: doc.jurisdicao,
          base_legal: doc.base_legal,
          versao: doc.versao,
        },
        { onConflict: 'key' },
      )
      .select('id')
      .single();
    if (tplError) throw new Error(`${doc.file}: upsert template falhou — ${tplError.message}`);

    const { error: phasesError } = await supabase.from('tl_phases').upsert(
      doc.phases.map((p) => ({ ...p, template_id: tpl.id })),
      { onConflict: 'template_id,ordem' },
    );
    if (phasesError) throw new Error(`${doc.file}: upsert fases falhou — ${phasesError.message}`);

    // Aviso para fases órfãs (existem na BD mas já não no .md). Não apagamos
    // automaticamente: podem estar referenciadas por tl_instance_phases.
    const { count } = await supabase
      .from('tl_phases')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', tpl.id);
    if ((count ?? 0) > doc.phases.length) {
      console.warn(
        `⚠️  ${doc.key}: ${count} fases na BD > ${doc.phases.length} no .md — rever/remover manualmente as órfãs.`,
      );
    }
    console.log(`✅ ${doc.key}: template + ${doc.phases.length} fases upserted (total BD: ${count})`);
  }

  // Contagens finais
  const { count: tplCount } = await supabase
    .from('tl_templates')
    .select('id', { count: 'exact', head: true });
  const { count: phaseCount } = await supabase
    .from('tl_phases')
    .select('id', { count: 'exact', head: true });
  console.log(`\n📊 Totais na BD: ${tplCount} templates, ${phaseCount} fases.`);
}

main().catch((e) => {
  console.error(`❌ ${e.message}`);
  process.exit(1);
});
