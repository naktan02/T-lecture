// client/src/features/settings/ui/TeamsSection.tsx
import { useState, ReactElement } from 'react';
import { useTeams } from '../model/useSettings';
import { Button } from '../../../shared/ui';
import { showConfirm } from '../../../shared/utils';

export const TeamsSection = (): ReactElement => {
  const {
    teams,
    isLoading,
    createTeam,
    updateTeam,
    deleteTeam,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTeams();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  const handleEdit = (id: number, currentName: string | null) => {
    setEditingId(id);
    setEditValue(currentName ?? '');
  };

  const handleSave = (id: number) => {
    updateTeam({ id, name: editValue });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAdd = () => {
    setIsAdding(true);
    setNewTeamName('');
  };

  const handleAddSave = () => {
    if (newTeamName.trim()) {
      createTeam(newTeamName.trim());
      setIsAdding(false);
      setNewTeamName('');
    }
  };

  const handleAddCancel = () => {
    setIsAdding(false);
    setNewTeamName('');
  };

  const handleDelete = async (id: number, name: string | null) => {
    const confirmed = await showConfirm(
      `"${name || '이름 없음'}" 팀을 삭제하시겠습니까?\n\n삭제된 팀은 설정에서 보이지 않지만, 기존 강사 이력에서는 확인 가능합니다.`,
    );
    if (confirmed) {
      deleteTeam(id);
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-500 py-8">로딩 중...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-800">팀 관리</h2>
          <p className="text-sm text-gray-500 mt-1">강사들이 속하는 팀을 관리합니다.</p>
        </div>
        <Button variant="primary" size="small" onClick={handleAdd} disabled={isAdding}>
          + 팀 추가
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                팀 이름
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
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="새 팀 이름 입력"
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
                      disabled={isCreating || !newTeamName.trim()}
                    >
                      추가
                    </Button>
                  </div>
                </td>
              </tr>
            )}
            {teams.map((team) => (
              <tr key={team.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">{team.id}</td>
                <td className="px-4 py-3">
                  {editingId === team.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm text-gray-800">{team.name || '-'}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === team.id ? (
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
                        onClick={() => handleSave(team.id)}
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
                        onClick={() => handleEdit(team.id, team.name)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleDelete(team.id, team.name)}
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

        {teams.length === 0 && !isAdding && (
          <div className="text-center text-gray-500 py-8">등록된 팀이 없습니다.</div>
        )}
      </div>
    </div>
  );
};
