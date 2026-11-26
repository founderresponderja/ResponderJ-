// RJ-13.2: dias úteis em Portugal (para o prazo de 15 dias úteis do Livro de Reclamações).
// Conta os feriados nacionais obrigatórios. O Carnaval (facultativo) e os feriados municipais
// não contam: é a leitura mais prudente (o prazo nunca fica mais longo do que devia).
// Sem dependências; as datas são tratadas em UTC, no calendário de Portugal continental.

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher), em UTC. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const DAY = 24 * 3600 * 1000;
const key = (d: Date) => d.toISOString().slice(0, 10);
const startOfDayUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const holidayCache = new Map<number, Set<string>>();

/** Feriados nacionais obrigatórios (Código do Trabalho, art. 234.º). */
export function portugueseHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const fixed = ["01-01", "04-25", "05-01", "06-10", "08-15", "10-05", "11-01", "12-01", "12-08", "12-25"]
    .map((md) => `${year}-${md}`);
  const movable = [
    new Date(easter.getTime() - 2 * DAY), // Sexta-feira Santa
    easter, // Domingo de Páscoa
    new Date(easter.getTime() + 60 * DAY), // Corpo de Deus
  ].map(key);
  const set = new Set([...fixed, ...movable]);
  holidayCache.set(year, set);
  return set;
}

export function isBusinessDay(date: Date): boolean {
  const d = startOfDayUTC(date);
  const weekday = d.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !portugueseHolidays(d.getUTCFullYear()).has(key(d));
}

/**
 * Último dia do prazo: conta `days` dias úteis a partir do dia SEGUINTE ao da receção
 * (a contagem começa no dia seguinte, como nos prazos administrativos).
 */
export function addBusinessDays(from: Date, days: number): Date {
  let d = startOfDayUTC(from);
  let counted = 0;
  while (counted < days) {
    d = new Date(d.getTime() + DAY);
    if (isBusinessDay(d)) counted++;
  }
  return d;
}

/**
 * Dias úteis que faltam até ao último dia do prazo, contando hoje se for útil.
 * 1 = hoje é o último dia; 0 ou negativo = prazo ultrapassado.
 */
export function businessDaysLeft(today: Date, dueDate: Date): number {
  const t = startOfDayUTC(today);
  const due = startOfDayUTC(dueDate);
  if (t.getTime() > due.getTime()) {
    let late = 0;
    let d = due;
    while (d.getTime() < t.getTime()) {
      d = new Date(d.getTime() + DAY);
      if (isBusinessDay(d)) late++;
    }
    return late === 0 ? 0 : -late;
  }
  let left = 0;
  let d = t;
  while (d.getTime() <= due.getTime()) {
    if (isBusinessDay(d)) left++;
    d = new Date(d.getTime() + DAY);
  }
  return left;
}
