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

  // \{\{([\s\S]*?)\}\} : 내부에 '}'가 있어도 non-greedy로 안전
  const re = /\{\{([\s\S]*?)\}\}/g;

  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input)) !== null) {
    const start = m.index;
    const end = re.lastIndex;

    // 앞의 일반 텍스트
    if (start > last) {
      pushTextWithNewlines(tokens, input.slice(last, start));
    }

    const raw = m[1] ?? '';
    const { key, format } = parseInner(raw);

    if (format !== undefined) tokens.push({ type: 'format', key, format });
    else tokens.push({ type: 'var', key });

    last = end;
  }

  // 뒤의 일반 텍스트
  if (last < input.length) {
    pushTextWithNewlines(tokens, input.slice(last));
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
