/**
 * Turns numbers written in words (what speech recognition often returns) into
 * digits, so the rule-based Fill parser can read them:
 *
 *   "one hundred eighteen over seventy-six, pulse sixty four" → "118 over 76, pulse 64"
 *   "one eighteen over seventy six"                           → "118 over 76"
 *   "six and a half hours" / "an hour and a half"             → "6.5 hours" / "1.5 hours"
 *   "half an hour" → "30 minutes" · "forty point five" → "40.5"
 *   "bed at eleven thirty"                                    → "bed at 11:30"
 *   "sixty for" (recognizer homophone)                        → "64"
 *
 * Case-insensitive; the rest of the text keeps its case. No imports, so it is easy to test alone.
 */

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
/** Words a recognizer writes instead of a digit right after a tens word ("sixty for"). */
const HOMOPHONE: Record<string, number> = { for: 4, fore: 4, to: 2, too: 2, ate: 8 };

type Tok = { w: string; start: number; end: number };

function readUnder100(t: Tok[], i: number): [number, number] | null {
  const w = t[i]?.w;
  if (w === undefined) return null;
  if (w in UNITS) return [UNITS[w], i + 1];
  if (w in TENS) {
    const v = TENS[w];
    const n = t[i + 1]?.w;
    if (n !== undefined && n in UNITS && UNITS[n] > 0 && UNITS[n] < 10) return [v + UNITS[n], i + 2];
    const after = t[i + 2]?.w;
    const nextIsNumber = after !== undefined && (after in UNITS || after in TENS);
    if (n !== undefined && n in HOMOPHONE && !nextIsNumber) return [v + HOMOPHONE[n], i + 2];
    return [v, i + 1];
  }
  return null;
}

/** Reads one number starting at token i (tokens are already known to be contiguous). */
function readNumber(t: Tok[], i: number): [number, number] | null {
  let v: number;
  let j: number;
  if ((t[i]?.w === 'a' || t[i]?.w === 'an') && (t[i + 1]?.w === 'hundred' || t[i + 1]?.w === 'thousand')) {
    v = 1;
    j = i + 1;
  } else {
    const r = readUnder100(t, i);
    if (!r) return null;
    [v, j] = r;
  }
  if (t[j]?.w === 'thousand') {
    v *= 1000;
    j++;
    if (t[j]?.w === 'and') j++;
    const rest = readNumber(t, j);
    if (rest && rest[0] < 1000) [v, j] = [v + rest[0], rest[1]];
  } else if (t[j]?.w === 'hundred') {
    v *= 100;
    j++;
    const k = t[j]?.w === 'and' ? j + 1 : j;
    const r2 = readUnder100(t, k);
    if (r2) [v, j] = [v + r2[0], r2[1]];
  } else if (v > 0 && v < 10) {
    // "one eighteen" / "one twenty five" → 118 / 125 (how people say blood pressure)
    const r2 = readUnder100(t, j);
    if (r2 && r2[0] >= 10 && t[r2[1]]?.w !== 'hundred') [v, j] = [v * 100 + r2[0], r2[1]];
  }
  // decimals: "forty point five", "zero point four two"
  if (t[j]?.w === 'point' && t[j + 1] && t[j + 1].w in UNITS && UNITS[t[j + 1].w] < 10) {
    let dec = '';
    j++;
    while (t[j] && t[j].w in UNITS && UNITS[t[j].w] < 10) dec += String(UNITS[t[j++].w]);
    v = Number(`${v}.${dec}`);
  }
  // "six and a half"
  if (t[j]?.w === 'and' && t[j + 1]?.w === 'a' && t[j + 2]?.w === 'half') {
    v += 0.5;
    j += 3;
  }
  return [v, j];
}

export function spokenToDigits(input: string): string {
  let s = input
    .replace(/\ban hour and a half\b/gi, '1.5 hours')
    .replace(/\bhalf an hour\b/gi, '30 minutes')
    .replace(/\ban hour\b/gi, '1 hour')
    .replace(/\ba couple of\b/gi, 'two');

  // tokens with positions; a number may span tokens separated only by spaces / hyphens
  const toks: Tok[] = [];
  const re = /[a-z]+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) toks.push({ w: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });

  const out: string[] = [];
  let cursor = 0;
  let i = 0;
  while (i < toks.length) {
    // only read across plain spaces / hyphens (a comma ends a number)
    let k = i;
    while (k + 1 < toks.length && /^[\s-]*$/.test(s.slice(toks[k].end, toks[k + 1].start))) k++;
    const run = toks.slice(i, k + 1);
    const r = readNumber(run, 0);
    if (r) {
      const [v, used] = r;
      const first = run[0];
      const last = run[used - 1];
      out.push(s.slice(cursor, first.start), String(v));
      cursor = last.end;
      i += used;
    } else i++;
  }
  out.push(s.slice(cursor));
  s = out.join('');

  // spoken clock times: "at 11 30" → "at 11:30", "at 6 o'clock" → "at 6:00"
  s = s.replace(/\b(at|by|around|until|till)\s+(\d{1,2})\s+([0-5]\d)\b/gi, '$1 $2:$3');
  s = s.replace(/\b(\d{1,2})\s*o'?\s?clock\b/gi, '$1:00');
  return s;
}
