/**
 * Seed das timelines de processos a partir de docs/timelines/timeline-*.md
 * (fonte de verdade do conteúdo — ver docs/timelines/feature-timelines-brief.md).
 *
 * Faz parse do frontmatter YAML e das tabelas markdown de fases de cada
 * ficheiro e faz upsert em tl_templates (por `key`) + tl_phases (por
 * `template_id, ordem`). Corre com service role (bypass RLS):
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:timelines
 *   npm run seed:timelines -- --dry-run          # só parse + contagens
 *   npm run seed:timelines -- --dir <pasta>      # pasta alternativa de .md
 *
 * ── PRAZOS NÃO SÃO ACEITES COMO DADOS ─────────────────────────────────
 * Os documentos atuais estão em rascunho, pendentes de validação pelos
 * advogados de cada área. Por decisão explícita, o seed NÃO carrega
 * `prazo_dias` (fica sempre null): o texto do prazo é preservado apenas nas
 * notas internas ("Prazo (por validar): …"), e as marcas ⚠️ do documento
 * ativam `confirmar`. Quando as timelines forem validadas, reativar a
 * extração com a flag `--accept-prazos`.
 * ──────────────────────────────────────────────────────────────────────
 *
 * Formato aceite (tolerante ao formato real dos documentos):
 *  - Frontmatter: `titulo` (ou `title`); `key` opcional — deriva do nome do
 *    ficheiro (timeline-<key>.md); area, jurisdicao, base_legal, versao.
 *  - Fases: TODAS as tabelas markdown com uma coluna de designação
 *    (Fase/Marco/Evento/Obrigação) são concatenadas pela ordem do documento;
 *    `#` é respeitado quando existe, senão continua a numeração.
 *  - `Tipo` é normalizado para o enum canónico (gatilho, prazo_parte,
 *    prazo_tribunal, marco); em falta ou desconhecido → marco.
 *  - ⚠️ em qualquer célula da linha → confirmar=true.
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
const ACCEPT_PRAZOS = process.argv.includes('--accept-prazos');
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

/** Normalização dos tipos livres dos documentos para o enum canónico. */
const TIPO_MAP: Record<string, Tipo> = {
  gatilho: 'gatilho',
  evento_gatilho: 'gatilho',
  'evento-gatilho': 'gatilho',
  prazo_parte: 'prazo_parte',
  prazo_de_parte: 'prazo_parte',
  prazo_do_requerente: 'prazo_parte',
  ato_do_requerente: 'prazo_parte',
  ato_do_exequente: 'prazo_parte',
  ato_do_autor: 'prazo_parte',
  prazo_tribunal: 'prazo_tribunal',
  prazo_do_tribunal: 'prazo_tribunal',
  decisao_aima: 'prazo_tribunal',
  decisao: 'prazo_tribunal',
  marco: 'marco',
  marco_do_tribunal: 'marco',
  marco_aima: 'marco',
  obrigacao_continuada: 'marco',
  regra: 'marco',
  despacho: 'marco',
  recomendado: 'marco',
};

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

type Col =
  | 'ordem'
  | 'label'
  | 'tipo'
  | 'base_legal'
  | 'prazo'
  | 'contagem'
  | 'anchor'
  | 'is_optional'
  | 'confirmar'
  | 'notas';

const HEADER_MAP: Record<string, Col> = {
  '#': 'ordem',
  n: 'ordem',
  ordem: 'ordem',
  fase: 'label',
  label: 'label',
  etapa: 'label',
  marco: 'label',
  evento: 'label',
  obrigacao: 'label',
  tipo: 'tipo',
  baselegal: 'base_legal',
  base: 'base_legal',
  prazo: 'prazo',
  prazoregra: 'prazo',
  prazodias: 'prazo',
  dias: 'prazo',
  data: 'prazo',
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
  output: 'notas',
};

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());
}

/** Limpa markdown leve (ênfase) de uma célula. */
function cleanCell(v: string): string {
  return v.replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
}

const EMPTY_CELL = /^[—–\-\s]*$/;

function parsePhaseTables(md: string, file: string): PhaseRow[] {
  const lines = md.split('\n');
  const rows: PhaseRow[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\s*\|.*\|\s*$/.test(lines[i])) continue;
    if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const headers = splitTableRow(lines[i]).map((h) => {
      const n = normHeader(h);
      return HEADER_MAP[n] ?? (n.includes('⚠') ? 'confirmar' : null);
    });
    // Só tabelas com coluna de designação de fase contam (exclui tabelas
    // auxiliares como "Via de investimento" ou "Prazos legais/Item").
    if (!headers.includes('label')) {
      i++; // salta o separador; as linhas de dados falham o teste do cabeçalho
      continue;
    }

    let j = i + 2;
    for (; j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j]); j++) {
      const cells = splitTableRow(lines[j]);
      const raw: Partial<Record<Col, string>> = {};
      headers.forEach((h, idx) => {
        const v = cells[idx];
        if (!h || v === undefined || EMPTY_CELL.test(v)) return;
        // Colunas duplicadas ou fundidas (ex.: Output + Notas) concatenam.
        raw[h] = raw[h] ? `${raw[h]} · ${v}` : v;
      });

      const label = cleanCell(raw.label ?? '');
      if (!label) continue;

      const tipoNorm = (raw.tipo ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z]+/g, '_')
        .replace(/^_|_$/g, '');
      const tipo: Tipo = TIPO_MAP[tipoNorm] ?? 'marco';
      if (raw.tipo && !TIPO_MAP[tipoNorm]) {
        console.warn(`⚠️  ${file}: tipo desconhecido "${raw.tipo}" na fase "${label}" → marco`);
      }

      // ⚠️ em qualquer célula da linha ativa a flag de validação.
      const confirmar =
        cells.some((c) => c.includes('⚠')) ||
        /sim|yes|true|x|✓|✔/i.test(cleanCell(raw.confirmar ?? ''));

      // Prazos: NÃO aceites como dados (ver cabeçalho). O texto vai para as
      // notas internas; prazo_dias só com --accept-prazos e padrão "N dias".
      const prazoTexto = cleanCell(raw.prazo ?? '')
        .replace(/[⚠️]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
      let prazo_dias: number | null = null;
      if (ACCEPT_PRAZOS) {
        const m = prazoTexto.match(/^~?(\d+)\s*dias?\b/i);
        if (m) prazo_dias = parseInt(m[1], 10);
      }

      const notasParts = [
        cleanCell(raw.notas ?? '') || null,
        prazoTexto && prazo_dias === null ? `Prazo (por validar): ${prazoTexto}` : null,
      ].filter(Boolean);

      rows.push({
        // Ordem sequencial pela posição no documento — o `#` original não é
        // fiável como chave (reinicia entre tabelas, ex.: "Via A"/"Via B",
        // e admite valores como "5a"/"5b").
        ordem: rows.length + 1,
        label,
        tipo,
        base_legal: cleanCell(raw.base_legal ?? '') || null,
        prazo_dias,
        contagem: cleanCell(raw.contagem ?? '') || null,
        anchor: cleanCell(raw.anchor ?? '') || null,
        is_optional: /sim|yes|true|x|✓|✔/i.test(cleanCell(raw.is_optional ?? '')),
        confirmar,
        notas: notasParts.length ? notasParts.join(' · ') : null,
      });
    }
    i = j - 1;
  }

  if (!rows.length) {
    throw new Error(`${file}: nenhuma tabela de fases encontrada (coluna Fase/Marco/Evento/Obrigação)`);
  }
  return rows;
}

function parseDoc(path: string): TemplateDoc {
  const file = path.split('/').pop()!;
  const md = readFileSync(path, 'utf8');
  const fm = parseFrontmatter(md, file);
  const title = fm.title ?? fm.titulo;
  const key = fm.key ?? file.replace(/^timeline-/, '').replace(/\.md$/, '');
  if (!key || !title) throw new Error(`${file}: frontmatter tem de definir "titulo" (ou "title")`);
  return {
    file,
    key,
    title,
    area: fm.area ?? null,
    jurisdicao: fm.jurisdicao ?? null,
    base_legal: fm.base_legal ?? null,
    versao: fm.versao ?? null,
    phases: parsePhaseTables(md, file),
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

  if (!ACCEPT_PRAZOS) {
    console.log('ℹ️  Prazos NÃO aceites como dados (rascunhos por validar) — texto preservado nas notas internas.\n');
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
          label: p.label.length > 44 ? p.label.slice(0, 41) + '…' : p.label,
          tipo: p.tipo,
          prazo_dias: p.prazo_dias,
          confirmar: p.confirmar,
          notas: (p.notas ?? '').length > 48 ? p.notas!.slice(0, 45) + '…' : p.notas,
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
