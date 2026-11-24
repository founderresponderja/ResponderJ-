#!/usr/bin/env node
/**
 * Cronograma do Responder Já em Word (.docx), a partir das tarefas do Notion.
 *
 * Uso: NODE_PATH=$(npm root -g) node scripts/cronograma/gerar-cronograma.cjs tarefas.json config.json saida.docx
 *
 * tarefas.json: [{ "Tarefa": "RJ-1.2 — ...", "Estado": "Feito", "Prioridade": "P0 Crítico", "Esforço": "M (2-3 dias)" }, ...]
 *   (o resultado da consulta SQL ao quadro "Responder Já" do Notion)
 * config.json: ver config.json nesta pasta (data de hoje, gates, notas, feito desde a versão anterior).
 *
 * Regras de estimativa (dias úteis, uma pessoa):
 *   S = 0,5 · M = 2,5 · L = 5 · XL = 10
 *   Feito = 0 · Quase feito / Em curso = 0,5 (S: 0,25) · Bloqueado = 0,5 depois do gate · resto = esforço total
 *   config.overrides permite fixar os dias restantes de uma tarefa (ex.: RJ-4.7 com o Facebook já preparado).
 */
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, AlignmentType, LevelFormat, BorderStyle, PageOrientation,
} = require("docx");

const [tasksPath, configPath, outPath] = process.argv.slice(2);
if (!tasksPath || !configPath || !outPath) {
  console.error("Uso: node gerar-cronograma.cjs tarefas.json config.json saida.docx");
  process.exit(1);
}
const tasks = JSON.parse(fs.readFileSync(tasksPath, "utf8"));
const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));

// ---------------------------------------------------------------- datas
const HOLIDAYS = new Set(cfg.holidays || []);
const iso = (d) => d.toISOString().slice(0, 10);
const parse = (s) => new Date(`${s}T12:00:00Z`);
const isWorkday = (d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !HOLIDAYS.has(iso(d));
const nextWorkday = (d) => { const x = new Date(d); while (!isWorkday(x)) x.setUTCDate(x.getUTCDate() + 1); return x; };
/** Avança `days` dias úteis a partir do cursor (em meios dias). Devolve [início, fim, novoCursor]. */
function schedule(cursor, days) {
  const start = nextWorkday(cursor.date);
  let left = days, half = cursor.half, d = new Date(start), end = new Date(start);
  if (days <= 0) return [start, start, cursor];
  while (left > 0) {
    if (!isWorkday(d)) { d.setUTCDate(d.getUTCDate() + 1); continue; }
    const avail = half ? 0.5 : 1;
    const use = Math.min(avail, left);
    left -= use; end = new Date(d);
    if (use === avail) { half = false; d.setUTCDate(d.getUTCDate() + 1); } else { half = true; }
  }
  return [start, end, { date: d, half }];
}
const fmt = (d) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const fmtShort = (d) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const num = (x) => String(Math.round(x * 100) / 100).replace(".", ",");

// ---------------------------------------------------------------- tarefas
const EFFORT = { S: 0.5, M: 2.5, L: 5, XL: 10 };
const effortKey = (e) => (String(e || "").match(/^(XL|S|M|L)\b/) || [])[1] || null;
const idOf = (t) => (t.match(/^(RJ-[\d.]+|GATE-\d+|BACKLOG)/) || [])[1] || t;
const prio = (p) => { const m = String(p || "").match(/^P(\d)/); return m ? Number(m[1]) : 9; };
const phaseNum = (id) => { const m = id.match(/^RJ-(\d+)\./); return m ? Number(m[1]) : null; };

const rows = tasks.map((t) => {
  const id = idOf(t.Tarefa);
  const name = t.Tarefa.replace(/^[^—]+—\s*/, "");
  const ek = effortKey(t["Esforço"]);
  const full = ek ? EFFORT[ek] : 0;
  let rem;
  const st = t.Estado;
  if (st === "Feito" || st === "A eliminar") rem = 0;
  else if (st === "Quase feito" || st === "Em curso") rem = ek === "S" ? 0.25 : 0.5;
  else if (st === "Bloqueado") rem = 0.5;
  else rem = full;
  const key = `${id} ${name}`;
  for (const [pattern, value] of Object.entries(cfg.overrides || {})) if (key.includes(pattern)) rem = value;
  const ph = phaseNum(id);
  const block = id.startsWith("GATE") ? "gate" : id.startsWith("BACKLOG") ? "backlog" : ph !== null && ph >= 10 ? "apps" : "web";
  return { id, name, status: st, prio: prio(t.Prioridade), prioLabel: t.Prioridade, effort: ek, full, rem, block, ph };
});

const gates = cfg.gates || {};
const web = rows.filter((r) => r.block === "web");
const apps = rows.filter((r) => r.block === "apps");
const backlog = rows.filter((r) => r.block === "backlog" && r.status !== "A eliminar");

// Ordem: o que depende de um gate vai para quando o gate abre; a checklist de lançamento fica no fim;
// o resto por prioridade e depois pelo número da tarefa.
const quick = (r) => (["Quase feito", "Em curso"].includes(r.status) ? 0 : 1);
// Primeiro as confirmações rápidas (quase feitas), depois por prioridade e número.
const order = (a, b) => quick(a) - quick(b) || a.prio - b.prio || a.id.localeCompare(b.id, "pt", { numeric: true });
const start = { date: parse(cfg.today), half: false };

function plan(list, cursor) {
  const pending = list.filter((r) => r.rem > 0);
  const last = pending.filter((r) => (cfg.last || []).includes(r.id));
  const waiting = pending.filter((r) => !last.includes(r) && (cfg.dependsOn || {})[r.id]);
  const normal = pending.filter((r) => !last.includes(r) && !waiting.includes(r)).sort(order);
  const out = [];
  let cur = cursor;
  for (const r of normal) { const [s, e, c] = schedule(cur, r.rem); out.push({ ...r, start: s, end: e }); cur = c; }
  for (const r of waiting.sort(order)) {
    const g = gates[(cfg.dependsOn || {})[r.id]];
    let c = cur;
    if (g && g.expected) { const gd = parse(g.expected); if (gd > c.date) c = { date: gd, half: false }; }
    const [s, e, c2] = schedule(c, r.rem);
    out.push({ ...r, start: s, end: e, gate: (cfg.dependsOn || {})[r.id] });
    if (c2.date > cur.date) cur = c2;
  }
  for (const r of last.sort(order)) { const [s, e, c] = schedule(cur, r.rem); out.push({ ...r, start: s, end: e }); cur = c; }
  return { out, cursor: cur };
}
const webPlan = plan(web, start);
const webEnd = webPlan.out.reduce((m, r) => (r.end > m ? r.end : m), parse(cfg.today));
const appsPlan = plan(apps, { date: new Date(webEnd.getTime() + 86400000), half: false });
const appsEnd = appsPlan.out.reduce((m, r) => (r.end > m ? r.end : m), webEnd);

const sum = (l) => l.reduce((a, r) => a + r.rem, 0);
const count = (l, f) => l.filter(f).length;

// ---------------------------------------------------------------- documento
const FONT = "Arial";
const run = (text, o = {}) => new TextRun({ text: String(text), font: FONT, size: 20, ...o });
const P = (parts, o = {}) => new Paragraph({ spacing: { after: 120 }, ...o, children: (Array.isArray(parts) ? parts : [parts]).map((x) => (typeof x === "string" ? run(x) : x)) });
const B = (t) => run(t, { bold: true });
const H = (level, t) => new Paragraph({ heading: level, children: [new TextRun(t)] });
const bullet = (parts) => new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 60 }, children: (Array.isArray(parts) ? parts : [parts]).map((x) => (typeof x === "string" ? run(x) : x)) });
const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };
const HEAD = "0F4C5C";
function table(head, body, widths, opts = {}) {
  const W = widths.reduce((a, b) => a + b, 0);
  const pad = opts.pad ?? 80;
  const cell = (t, w, h, extra = {}) => new TableCell({
    width: { size: w, type: WidthType.DXA }, borders, margins: { top: 50, bottom: 50, left: pad, right: pad },
    shading: h ? { type: ShadingType.CLEAR, color: "auto", fill: HEAD } : extra.fill ? { type: ShadingType.CLEAR, color: "auto", fill: extra.fill } : undefined,
    children: [new Paragraph({ children: [run(t, { size: opts.size || 18, bold: h || extra.bold, color: h ? "FFFFFF" : undefined })] })],
  });
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((t, i) => cell(t, widths[i], true)) }),
      ...body.map((r, ri) => new TableRow({ children: r.map((t, i) => {
        const fill = opts.fill ? opts.fill(ri, i) : undefined;
        return cell(t, widths[i], false, { fill, bold: opts.boldLast && ri === body.length - 1 });
      }) })),
    ],
  });
}

const kids = [];
const version = cfg.version ? `Versão ${cfg.version} — ` : "";
kids.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Responder Já — Cronograma")] }));
kids.push(P(`${version}situação a ${fmt(parse(cfg.today))}. Fonte: quadro Responder Já no Notion e repositório. Estimativas em dias úteis de trabalho, uma pessoa, sem fins de semana nem feriados nacionais.`));

kids.push(H(HeadingLevel.HEADING_1, "Resumo"));
kids.push(P([
  "A versão web fica pronta para lançar a ", B(fmt(webEnd)),
  `, com cerca de ${num(sum(web))} dias de trabalho por fazer. Das ${web.length} tarefas da web, ${count(web, (r) => r.status === "Feito")} estão feitas e ${count(web, (r) => ["Quase feito", "Em curso"].includes(r.status))} quase feitas. `,
  "As apps móveis vêm a seguir e acabam a ", B(fmt(appsEnd)), `, com ${num(sum(apps))} dias.`,
]));
kids.push(table(
  ["Bloco", "Tarefas", "Feitas", "Quase feitas", "Dias por fazer", "Fim previsto"],
  [
    ["Web até ao lançamento (RJ-0 a RJ-9)", web.length, count(web, (r) => r.status === "Feito"), count(web, (r) => ["Quase feito", "Em curso"].includes(r.status)), num(sum(web)), fmt(webEnd)],
    ["Apps móveis (RJ-10 a RJ-12)", apps.length, count(apps, (r) => r.status === "Feito"), count(apps, (r) => ["Quase feito", "Em curso"].includes(r.status)), num(sum(apps)), fmt(appsEnd)],
    ["Backlog (depois do lançamento)", backlog.length, 0, 0, num(sum(backlog)), "—"],
  ].map((r) => r.map(String)),
  [3400, 900, 900, 1200, 1300, 1326],
));
kids.push(P(""));
for (const n of cfg.summaryNotes || []) kids.push(bullet(n));

// Gates
kids.push(H(HeadingLevel.HEADING_1, "Bloqueios externos (gates)"));
kids.push(table(["Gate", "Estado", "Data prevista", "O que falta"],
  Object.entries(gates).map(([k, g]) => [k, g.status || "", g.expected ? fmt(parse(g.expected)) : "sem data", g.note || ""]),
  [1100, 1300, 1400, 5226]));
kids.push(P(""));

// Plano da web
kids.push(H(HeadingLevel.HEADING_1, "Plano da versão web"));
kids.push(table(["Tarefa", "Descrição", "Estado", "Prior.", "Dias", "Início", "Fim"],
  webPlan.out.map((r) => [r.id, r.name + (r.gate ? ` (espera ${r.gate})` : ""), r.status, r.prioLabel?.slice(0, 2) || "", num(r.rem), fmtShort(r.start), fmtShort(r.end)]),
  [900, 3900, 1100, 600, 600, 900, 1026], { size: 16 }));
kids.push(P(""));

// Gantt por semanas (web + apps)
const all = [...webPlan.out, ...appsPlan.out];
if (all.length) {
  const monday = (d) => { const x = new Date(d); const k = (x.getUTCDay() + 6) % 7; x.setUTCDate(x.getUTCDate() - k); return x; };
  const weeks = [];
  for (let w = monday(parse(cfg.today)); w <= appsEnd; w = new Date(w.getTime() + 7 * 86400000)) weeks.push(w);
  const maxCols = 18;
  const shown = weeks.slice(0, maxCols);
  kids.push(H(HeadingLevel.HEADING_1, "Mapa por semanas"));
  kids.push(P(`Cada coluna é uma semana (segunda-feira indicada). Tarefas da web a verde-petróleo, apps a dourado.${weeks.length > maxCols ? ` Mostram-se as primeiras ${maxCols} semanas.` : ""}`));
  const first = 1600, rest = Math.floor((9026 - first) / shown.length);
  const body = all.map((r) => [r.id, ...shown.map(() => "")]);
  kids.push(table(["Tarefa", ...shown.map(fmtShort)], body, [first, ...shown.map(() => rest)], {
    size: 12, pad: 20,
    fill: (ri, ci) => {
      if (ci === 0) return undefined;
      const r = all[ri]; const ws = shown[ci - 1]; const we = new Date(ws.getTime() + 6 * 86400000);
      return r.start <= we && r.end >= ws ? (r.block === "apps" ? "C9A227" : "2E7D7A") : undefined;
    },
  }));
  kids.push(P(""));
}

// Feito recentemente
if ((cfg.doneSince || []).length) {
  kids.push(H(HeadingLevel.HEADING_1, cfg.doneSinceTitle || "Feito desde a versão anterior"));
  kids.push(table(["Tarefa", "O que mudou", "PR"], cfg.doneSince, [1400, 6426, 1200]));
  kids.push(P(""));
}

// À espera do Luís
if ((cfg.waitingOnOwner || []).length) {
  kids.push(H(HeadingLevel.HEADING_1, "À tua espera"));
  for (const n of cfg.waitingOnOwner) kids.push(bullet(n));
}

// Apps e backlog
kids.push(H(HeadingLevel.HEADING_1, "Apps móveis (depois da web)"));
kids.push(table(["Tarefa", "Descrição", "Estado", "Dias", "Início", "Fim"],
  appsPlan.out.map((r) => [r.id, r.name, r.status, num(r.rem), fmtShort(r.start), fmtShort(r.end)]),
  [900, 4600, 1300, 700, 750, 776], { size: 16 }));
kids.push(P(""));
kids.push(H(HeadingLevel.HEADING_1, "Backlog (depois do lançamento)"));
for (const r of backlog) kids.push(bullet(`${r.name} — ${num(r.rem)} dias`));
kids.push(P(""));
kids.push(P(run("Regras de estimativa: S = 0,5 dia, M = 2,5, L = 5, XL = 10. Feito = 0; quase feito ou em curso = 0,5; bloqueado = 0,5 depois do gate. As datas assumem trabalho seguido; os gates externos podem empurrá-las.", { italics: true, size: 16 })));

const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 20 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { font: FONT, size: 40, bold: true, color: HEAD }, paragraph: { spacing: { before: 0, after: 160 }, keepNext: true } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 28, bold: true, color: HEAD }, paragraph: { spacing: { before: 280, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { before: 200, after: 100 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: kids }],
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log(JSON.stringify({ out: outPath, webDays: sum(web), webEnd: iso(webEnd), appsDays: sum(apps), appsEnd: iso(appsEnd) }));
});
