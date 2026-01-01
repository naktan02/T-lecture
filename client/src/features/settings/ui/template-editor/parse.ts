import type { Token } from './types';

function parseInner(raw: string): { key: string; format?: string } {
  // raw 예: "locations:format=[{placeName}] 인원:{actualCount}"
  const idx = raw.indexOf(':format=');
  if (idx === -1) return { key: raw.trim() };

  const key = raw.slice(0, idx).trim();
  const format = raw.slice(idx + ':format='.length); // 그대로 보존
  return { key, format };
}

export function parseTemplateToTokens(input: string): Token[] {
  const tokens: Token[] = [];

  /**
   * ⚠️ IMPORTANT
   * format 안에는 "{actualCount}" 같은 중괄호가 들어간다.
   * "{{ ... }}" 토큰을 파싱할 때, '}' 하나로 닫히면 format이 잘려버린다.
   * 따라서 반드시 "{{" ~ "}}" 쌍으로만 토큰을 끊는 안전한 스캐닝 방식으로 파싱한다.
   */
  let cursor = 0;

  while (true) {
    const start = input.indexOf('{{', cursor);
    if (start === -1) break;
    // 앞의 일반 텍스트
    if (start > cursor) {
      pushTextWithNewlines(tokens, input.slice(cursor, start));
    }

    const end = input.indexOf('}}', start + 2);
    if (end === -1) {
      // 닫힘이 없으면 나머지를 텍스트로 취급 (깨진 템플릿 방어)
      pushTextWithNewlines(tokens, input.slice(start));
      cursor = input.length;
      break;
    }

    const raw = input.slice(start + 2, end);
    const { key, format } = parseInner(raw);

    if (format !== undefined) tokens.push({ type: 'format', key, format });
    else tokens.push({ type: 'var', key });

    cursor = end + 2;
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