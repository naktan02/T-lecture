/*
  Migration: template_jsonb_format_presets
  - 기존 본문(TEXT) 컬럼을 JSONB로 변환
  - formatPresets JSONB 컬럼 추가
  
  주의: 기존 데이터는 { tokens: [...] } 형태로 변환됩니다.
  parseTemplateToTokens 로직을 SQL로 구현하기 어려우므로,
  먼저 단순 텍스트를 하나의 text 토큰으로 래핑합니다.
  실제 파싱은 seed 재실행 시 처리됩니다.
*/

-- 1. formatPresets 컬럼 추가
ALTER TABLE "메시지_템플릿" ADD COLUMN "포맷프리셋" JSONB;

-- 2. 기존 본문 데이터를 임시로 JSON 형태로 변환 (단일 text 토큰으로 래핑)
-- 주의: 기존 텍스트 데이터를 JSON 객체로 감쌉니다.
ALTER TABLE "메시지_템플릿" 
  ALTER COLUMN "본문" TYPE JSONB 
  USING jsonb_build_object('tokens', jsonb_build_array(jsonb_build_object('type', 'text', 'text', "본문")));
