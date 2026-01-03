// server/src/types/template.types.ts
// Token 타입 정의 - 클라이언트와 동일한 구조

export type Token =
  | { type: 'text'; text: string }
  | { type: 'newline' }
  | { type: 'var'; key: string }
  | { type: 'format'; key: string; format: string };

export interface MessageTemplateBody {
  tokens: Token[];
}

// 포맷 변수별 프리셋 (예: { "instructors": "{index}. {name}", "locations": "[{placeName}]" })
export type FormatPresets = Record<string, string>;

/**
 * 템플릿 문자열 → Token 배열 변환 (마이그레이션용)
 */
export function parseTemplateToTokens(input: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  while (true) {
    const start = input.indexOf('{{', cursor);
    if (start === -1) break;

    // 앞의 일반 텍스트
    if (start > cursor) {
      pushTextWithNewlines(tokens, input.slice(cursor, start));
    }

    const found = findTokenEnd(input, start + 2);
    if (!found) {
      pushTextWithNewlines(tokens, input.slice(start));
      cursor = input.length;
      break;
    }

    const { end, consumeTo } = found;
    const raw = input.slice(start + 2, end);
    const { key, format } = parseInner(raw);

    if (format !== undefined) {
      tokens.push({ type: 'format', key, format });
    } else {
      tokens.push({ type: 'var', key });
    }

    cursor = consumeTo;
  }

  // 뒤의 일반 텍스트
  if (cursor < input.length) {
    pushTextWithNewlines(tokens, input.slice(cursor));
  }

  return compactTokens(tokens);
}

function parseInner(raw: string): { key: string; format?: string } {
  const idx = raw.indexOf(':format=');
  if (idx === -1) return { key: raw.trim() };

  const key = raw.slice(0, idx).trim();
  const format = raw.slice(idx + ':format='.length);
  return { key, format };
}

function findTokenEnd(
  input: string,
  startAfterOpen: number,
): { end: number; consumeTo: number } | null {
  for (let i = startAfterOpen; i < input.length - 1; i++) {
    if (input[i] === '}' && input[i + 1] === '}') {
      let j = i;
      while (j < input.length && input[j] === '}') j++;

      const end = j - 2;
      const consumeTo = j;
      return { end, consumeTo };
    }
  }
  return null;
}

function pushTextWithNewlines(tokens: Token[], chunk: string) {
  const parts = chunk.split('\n');
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length) tokens.push({ type: 'text', text: parts[i] });
    if (i !== parts.length - 1) tokens.push({ type: 'newline' });
  }
}

function compactTokens(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const t of tokens) {
    const prev = out[out.length - 1];
    if (t.type === 'text' && prev?.type === 'text') {
      prev.text += t.text;
    } else {
      out.push(t);
    }
  }
  return out;
}

/**
 * Token 배열 → 템플릿 문자열 (역변환용)
 */
export function tokensToTemplate(tokens: Token[]): string {
  return tokens
    .map((t) => {
      if (t.type === 'text') return t.text;
      if (t.type === 'newline') return '\n';
      if (t.type === 'var') return `{{${t.key}}}`;
      if (t.type === 'format') return `{{${t.key}:format=${t.format}}}`;
      return '';
    })
    .join('');
}
