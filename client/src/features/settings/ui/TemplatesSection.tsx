// client/src/features/settings/ui/TemplatesSection.tsx
import { useState, ReactElement } from 'react';
import { useTemplates } from '../model/useSettings';
import { TemplateBlockEditor } from './TemplateBlockEditor';
import { Button } from '../../../shared/ui';
import { MessageTemplate } from '../settingsApi';

const TEMPLATE_LABELS: Record<string, { name: string; description: string }> = {
  TEMPORARY: {
    name: '임시 배정 메시지',
    description: '강사에게 임시 배정을 알리는 메시지',
  },
  CONFIRMED_LEADER: {
    name: '확정 배정 (팀장용)',
    description: '팀장에게 확정 배정을 알리는 메시지',
  },
  CONFIRMED_MEMBER: {
    name: '확정 배정 (팀원용)',
    description: '팀원에게 확정 배정을 알리는 메시지',
  },
};

export const TemplatesSection = (): ReactElement => {
  const { templates, isLoading, updateTemplate, isUpdating } = useTemplates();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  const handleEdit = (template: MessageTemplate) => {
    setEditingKey(template.key);
    setEditTitle(template.title);
    setEditBody(template.body);
  };

  const handleSave = () => {
    if (editingKey) {
      updateTemplate({ key: editingKey, title: editTitle, body: editBody });
      setEditingKey(null);
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditTitle('');
    setEditBody('');
  };

  const getTemplateInfo = (key: string) => {
    return TEMPLATE_LABELS[key] || { name: key, description: '' };
  };

  if (isLoading) {
    return <div className="text-center text-gray-500 py-8">로딩 중...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">메시지 템플릿</h2>
        <p className="text-sm text-gray-500 mt-1">
          강사에게 발송되는 메시지 템플릿을 관리합니다. 블럭을 드래그하여 순서를 변경할 수 있습니다.
        </p>
      </div>

      <div className="space-y-6">
        {templates.map((template) => {
          const info = getTemplateInfo(template.key);
          const isEditing = editingKey === template.key;

          return (
            <div key={template.key} className="bg-white rounded-lg border border-gray-200 p-6">
              {/* 헤더 */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{info.name}</h3>
                  <p className="text-sm text-gray-500">{info.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    키: {template.key} · 마지막 수정:{' '}
                    {new Date(template.updatedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                {/* 버튼 - 항상 같은 위치 */}
                <div className="flex gap-2 flex-shrink-0">
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
                /* 편집 모드 */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">본문</label>
                    <TemplateBlockEditor value={editBody} onChange={setEditBody} />
                  </div>
                </div>
              ) : (
                /* 보기 모드 */
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">제목</div>
                    <div className="text-sm text-gray-800">{template.title}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">본문</div>
                    <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                      {template.body}
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
    </div>
  );
};
