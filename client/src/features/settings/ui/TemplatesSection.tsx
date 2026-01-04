// client/src/features/settings/ui/TemplatesSection.tsx
import { useState, ReactElement, useCallback } from 'react';
import { useTemplates } from '../model/useSettings';
import { Button } from '../../../shared/ui';
import { MessageTemplate, MessageTemplateBody, FormatPresets } from '../settingsApi';
import {
  TemplateEditor,
  variableConfig,
  variableCategories,
  formatPlaceholders,
  FormatVariableModal,
} from './template-editor';
import { parseTemplateToTokens, tokensToTemplate } from './template-editor/parse';
import type { VariableRegistry, Token, VariableDef } from './template-editor';

const TEMPLATE_LABELS: Record<string, { name: string; description: string }> = {
  TEMPORARY: {
    name: '임시 배정 메시지',
    description: '강사에게 임시 배정을 알리는 메시지',
  },
  CONFIRMED_LEADER: {
    name: '확정 배정 (총괄강사용)',
    description: '총괄강사에게 확정 배정을 알리는 메시지',
  },
  CONFIRMED_MEMBER: {
    name: '확정 배정 (팀원용)',
    description: '팀원에게 확정 배정을 알리는 메시지',
  },
};

function normalizeKey(key: string) {
  return key.trim();
}

// FormatVariableModal 변수 타입
interface LegacyVariableDefinition {
  key: string;
  label: string;
  icon: string;
  isFormatVariable?: boolean;
  formatPlaceholders?: string[];
}

export const TemplatesSection = (): ReactElement => {
  const { templates, isLoading, updateTemplate, isUpdating } = useTemplates();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editFormatPresets, setEditFormatPresets] = useState<FormatPresets>({});

  // 포맷 편집 모달 상태
  const [formatEditInfo, setFormatEditInfo] = useState<{
    index: number;
    token: Token & { type: 'format' };
    varDef: LegacyVariableDefinition;
  } | null>(null);

  // 포맷 삽입 모달 상태 (패널에서 클릭 시)
  const [formatInsertInfo, setFormatInsertInfo] = useState<{
    varDef: LegacyVariableDefinition;
    callback: (format: string) => void;
  } | null>(null);

  // 본문용 registry (포맷 변수 포함)
  const registry: VariableRegistry = {
    list: () => variableConfig,
    get: (key) => variableConfig.find((v) => normalizeKey(v.key) === key),
    normalizeKey,
    categories: () => variableCategories,
  };

  // API에서 Token[] 형태로 받아오므로, 에디터용 문자열로 변환
  const handleEdit = (template: MessageTemplate) => {
    setEditingKey(template.key);
    setEditTitle(template.title);
    // Token[] → 문자열 변환 (에디터용)
    const bodyStr = template.body?.tokens ? tokensToTemplate(template.body.tokens) : '';
    setEditBody(bodyStr);

    // ✅ 모든 포맷 변수에 대해 기본 프리셋 초기화 (기존 값 유지, 누락된 것만 추가)
    const existingPresets = template.formatPresets || {};
    const allPresets = { ...existingPresets };

    // registry에서 모든 포맷 변수 가져와서 기본값 설정
    variableConfig.forEach((v) => {
      if (v.isFormat && !allPresets[v.key]) {
        // defaultFormat이 있으면 사용, 없으면 빈 문자열
        allPresets[v.key] = v.defaultFormat || '';
      }
    });

    setEditFormatPresets(allPresets);
  };

  // 저장 시 문자열 → Token[] 변환 (프리셋은 마스터로 그대로 저장)
  const handleSave = async () => {
    if (!editingKey) return;
    try {
      // 에디터 문자열을 Token[] 변환
      const tokens = parseTemplateToTokens(editBody);
      const body: MessageTemplateBody = { tokens };

      await updateTemplate({
        key: editingKey,
        title: editTitle,
        body,
        formatPresets: editFormatPresets,
      });
      setEditingKey(null);
      setEditTitle('');
      setEditBody('');
      setEditFormatPresets({});
    } catch {
      // 에러는 useTemplates 훅에서 toast로 처리됨
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditTitle('');
    setEditBody('');
    setEditFormatPresets({});
  };

  // 포맷 변수 → 레거시 형태 변환 (플레이스홀더 포함)
  const toFormatVar = useCallback((varDef: VariableDef): LegacyVariableDefinition => {
    const placeholders = formatPlaceholders[varDef.key] || [];
    return {
      key: varDef.key,
      label: varDef.label,
      icon: varDef.icon || '🏷️',
      isFormatVariable: varDef.isFormat,
      formatPlaceholders: placeholders.map((p) => p.key),
    };
  }, []);

  // 편집 영역에서 포맷 클릭
  const handleEditFormat = useCallback(
    (index: number, token: Token & { type: 'format' }) => {
      const varDef = registry.get(normalizeKey(token.key));
      if (varDef) {
        setFormatEditInfo({ index, token, varDef: toFormatVar(varDef) });
      }
    },
    [registry, toFormatVar],
  );

  // ✅ 포맷 수정 확정: 프리셋 업데이트 + 본문 토큰 업데이트
  const handleConfirmFormat = (newFormat: string) => {
    if (!formatEditInfo) return;

    const tokens = parseTemplateToTokens(editBody);
    const idx = formatEditInfo.index;
    const tokenKey = formatEditInfo.token.key;

    // 프리셋 업데이트 (마스터)
    setEditFormatPresets((prev) => ({
      ...prev,
      [tokenKey]: newFormat,
    }));

    // 1) index가 유효하면 그 자리만 수정
    if (idx >= 0 && idx < tokens.length && tokens[idx].type === 'format') {
      (tokens[idx] as Token & { type: 'format' }).format = newFormat;
      setEditBody(tokensToTemplate(tokens));
      setFormatEditInfo(null);
      return;
    }

    // 2) 방어: index가 -1 등으로 들어오면 (key+format)으로 정확히 찾아 수정
    const fallbackIdx = tokens.findIndex(
      (t) =>
        t.type === 'format' &&
        t.key === formatEditInfo.token.key &&
        t.format === formatEditInfo.token.format,
    );

    if (fallbackIdx !== -1) {
      (tokens[fallbackIdx] as Token & { type: 'format' }).format = newFormat;
      setEditBody(tokensToTemplate(tokens));
    }
    setFormatEditInfo(null);
  };

  // 패널에서 포맷 클릭/드래그 요청 (기존 있으면 수정 모달, 없으면 삽입 모달 - 항상 모달 열기)
  const handleInsertFormat = useCallback(
    (varDef: VariableDef, callback: (format: string) => void) => {
      const tokens = parseTemplateToTokens(editBody);
      const existingToken = tokens.find((t) => t.type === 'format' && t.key === varDef.key) as
        | (Token & { type: 'format' })
        | undefined;

      if (existingToken) {
        // 이미 본문에 해당 포맷이 있다면 해당 토큰 정보로 수정 모달 열기
        setFormatEditInfo({
          index: -1,
          token: existingToken,
          varDef: toFormatVar(varDef),
        });
      } else {
        // 새 포맷 삽입 모드 - 항상 모달 열기 (프리셋은 모달의 기본값으로 사용됨)
        setFormatInsertInfo({ varDef: toFormatVar(varDef), callback });
      }
    },
    [toFormatVar, editBody],
  );

  // 포맷 삽입 확정 + 프리셋 업데이트
  const handleConfirmInsert = (format: string) => {
    if (formatInsertInfo) {
      const varKey = formatInsertInfo.varDef.key;
      // 프리셋 업데이트 (마스터)
      setEditFormatPresets((prev) => ({
        ...prev,
        [varKey]: format,
      }));
      formatInsertInfo.callback(format);
    }
    setFormatInsertInfo(null);
  };

  const getTemplateInfo = (key: string) => {
    return TEMPLATE_LABELS[key] || { name: key, description: '' };
  };

  if (isLoading) {
    return <div className="text-center text-gray-500 py-8">로딩 중...</div>;
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">메시지 템플릿</h2>
        <p className="text-sm text-gray-500 mt-1">강사에게 발송되는 메시지 템플릿을 관리합니다.</p>
      </div>

      <div className="space-y-6">
        {templates.map((template) => {
          const info = getTemplateInfo(template.key);
          const isEditing = editingKey === template.key;

          return (
            <div key={template.key} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{info.name}</h3>
                  <p className="text-sm text-gray-500">{info.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    키: {template.key} · 마지막 수정:{' '}
                    {new Date(template.updatedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={handleCancel}
                        disabled={isUpdating}
                      >
                        취소
                      </Button>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleSave}
                        disabled={isUpdating}
                      >
                        {isUpdating ? '저장 중...' : '저장'}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="small" onClick={() => handleEdit(template)}>
                      수정
                    </Button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  {/* 제목 (패널 없이 본문 패널 공유) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                    <TemplateEditor
                      value={editTitle}
                      onChange={setEditTitle}
                      registry={registry}
                      singleLine
                      hidePanel
                    />
                  </div>

                  {/* 본문 에디터 (변수 패널 포함) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">본문</label>
                    <TemplateEditor
                      value={editBody}
                      onChange={setEditBody}
                      registry={registry}
                      onEditFormat={handleEditFormat}
                      onInsertFormat={handleInsertFormat}
                      getFormatPreset={(key) => editFormatPresets[key] || ''}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">제목</div>
                    <div className="text-sm text-gray-800">{template.title}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">본문</div>
                    <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                      {template.body?.tokens ? tokensToTemplate(template.body.tokens) : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {templates.length === 0 && (
          <div className="text-center text-gray-500 py-8">등록된 템플릿이 없습니다.</div>
        )}
      </div>

      {/* 포맷 편집 모달 (편집 영역 클릭) */}
      {formatEditInfo && (
        <FormatVariableModal
          key={`edit-${formatEditInfo.varDef.key}`}
          variable={formatEditInfo.varDef}
          initialFormat={formatEditInfo.token.format}
          onConfirm={handleConfirmFormat}
          onCancel={() => setFormatEditInfo(null)}
        />
      )}

      {/* 포맷 삽입 모달 (패널 클릭) - formatPresets에서 기본값 불러오기 */}
      {formatInsertInfo && (
        <FormatVariableModal
          key={`insert-${formatInsertInfo.varDef.key}`}
          variable={formatInsertInfo.varDef}
          initialFormat={editFormatPresets[formatInsertInfo.varDef.key] || ''}
          onConfirm={handleConfirmInsert}
          onCancel={() => setFormatInsertInfo(null)}
        />
      )}
    </div>
  );
};
