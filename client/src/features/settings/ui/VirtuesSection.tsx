// client/src/features/settings/ui/VirtuesSection.tsx
import { useState, ReactElement } from 'react';
import { useVirtues } from '../model/useSettings';
import { Button } from '../../../shared/ui';
import { showConfirm } from '../../../shared/utils';

export const VirtuesSection = (): ReactElement => {
  const {
    virtues,
    isLoading,
    createVirtue,
    updateVirtue,
    deleteVirtue,
    isCreating,
    isUpdating,
    isDeleting,
  } = useVirtues();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newVirtueName, setNewVirtueName] = useState('');

  const handleEdit = (id: number, currentName: string | null) => {
    setEditingId(id);
    setEditValue(currentName ?? '');
  };

  const handleSave = (id: number) => {
    updateVirtue({ id, name: editValue });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAdd = () => {
    setIsAdding(true);
    setNewVirtueName('');
  };

  const handleAddSave = () => {
    if (newVirtueName.trim()) {
      createVirtue(newVirtueName.trim());
      setIsAdding(false);
      setNewVirtueName('');
    }
  };

  const handleAddCancel = () => {
    setIsAdding(false);
    setNewVirtueName('');
  };

  const handleDelete = async (id: number, name: string | null) => {
    const confirmed = await showConfirm(
      `"${name || '이름 없음'}" 덕목을 삭제하시겠습니까?\n\n해당 덕목을 수강 가능한 강사들의 연결도 함께 삭제됩니다.`,
    );
    if (confirmed) {
      deleteVirtue(id);
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-500 py-8">로딩 중...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-800">덕목 관리</h2>
          <p className="text-sm text-gray-500 mt-1">
            강사가 가르칠 수 있는 덕목(과목)을 관리합니다.
          </p>
        </div>
        <Button variant="primary" size="small" onClick={handleAdd} disabled={isAdding}>
          + 덕목 추가
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                덕목 이름
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isAdding && (
              <tr className="bg-blue-50">
                <td className="px-4 py-3 text-sm text-gray-400">-</td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={newVirtueName}
                    onChange={(e) => setNewVirtueName(e.target.value)}
                    placeholder="새 덕목 이름 입력"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={handleAddCancel}
                      disabled={isCreating}
                    >
                      취소
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={handleAddSave}
                      disabled={isCreating || !newVirtueName.trim()}
                    >
                      추가
                    </Button>
                  </div>
                </td>
              </tr>
            )}
            {virtues.map((virtue) => (
              <tr key={virtue.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">{virtue.id}</td>
                <td className="px-4 py-3">
                  {editingId === virtue.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm text-gray-800">{virtue.name || '-'}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === virtue.id ? (
                    <div className="flex justify-end gap-2">
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
                        onClick={() => handleSave(virtue.id)}
                        disabled={isUpdating}
                      >
                        저장
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => handleEdit(virtue.id, virtue.name)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleDelete(virtue.id, virtue.name)}
                        disabled={isDeleting}
                      >
                        삭제
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {virtues.length === 0 && !isAdding && (
          <div className="text-center text-gray-500 py-8">등록된 덕목이 없습니다.</div>
        )}
      </div>
    </div>
  );
};
