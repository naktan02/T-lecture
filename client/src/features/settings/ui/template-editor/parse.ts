import type { Token } from './types';

function parseInner(raw: string): { key: string; format?: string } {
  // raw 예: "locations:format=[{placeName}] 인원:{actualCount}"
  const idx = raw.indexOf(':format=');
  if (idx === -1) return { key: raw.trim() };

  const key = raw.slice(0, idx).trim();
  const format = raw.slice(idx + ':format='.length); // 그대로 보존
  return { key, format };
}

function findTokenEnd(input: string, startAfterOpen: number): { end: number; consumeTo: number } | null {
  // end: raw content가 끝나는 인덱스(= 닫힘 "}}" 시작 인덱스)
  // consumeTo: 커서를 옮길 위치(= 닫힘 포함해서 소비한 뒤 위치)
  for (let i = startAfterOpen; i < input.length - 1; i++) {
    if (input[i] === '}' && input[i + 1] === '}') {
      // 연속 '}' 런 길이 계산
      let j = i;
      while (j < input.length && input[j] === '}') j++;
      const runLen = j - i;

      // 런의 마지막 2개를 닫힘으로 사용
      const end = j - 2;        // raw content는 여기까지 (exclusive)
      const consumeTo = j;      // 런 전체 소비 (앞의 runLen-2는 raw에 포함됨)
      return { end, consumeTo };
    }
  }
  return null;
}

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
      // 닫힘이 없으면 나머지를 텍스트로 취급 (깨진 템플릿 방어)
      pushTextWithNewlines(tokens, input.slice(start));
      cursor = input.length;
      break;
    }
    const { end, consumeTo } = found;
    const raw = input.slice(start + 2, end);
    const { key, format } = parseInner(raw);

    if (format !== undefined) tokens.push({ type: 'format', key, format });
    else tokens.push({ type: 'var', key });

    cursor = consumeTo;
  }
  // 뒤의 일반 텍스트
  if (cursor < input.length) {
    pushTextWithNewlines(tokens, input.slice(cursor));
  }

  // 텍스트 토큰 병합 정리
  return compactTokens(tokens);
}

function pushTextWithNewlines(tokens: Token[], chunk: string) {
  // \n 기준으로 newline 토큰 분리
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
 * ✅ Token[] → 템플릿 문자열 직렬화
 * - 문자열 replace로 수정하지 않고, "토큰 단위"로 안전하게 재조립하기 위해 사용
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