// client/src/features/settings/ui/SettingsTabs.tsx
import { useState, ReactElement } from 'react';
import { TeamsSection } from './TeamsSection';
import { VirtuesSection } from './VirtuesSection';
import { DataBackupSection } from './DataBackupSection';
import { ReportSection } from './ReportSection';

type TabKey = 'teams' | 'virtues' | 'backup' | 'reports';

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { key: 'teams', label: '팀 관리', icon: '👥' },
  { key: 'virtues', label: '덕목 관리', icon: '📚' },
  { key: 'backup', label: '데이터 백업', icon: '💾' },
  { key: 'reports', label: '보고서 다운로드', icon: '📊' },
];

export const SettingsTabs = (): ReactElement => {
  const [activeTab, setActiveTab] = useState<TabKey>('teams');

  return (
    <div className="flex flex-col h-full">
      {/* 탭 헤더 */}
      <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0
              ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeTab === 'teams' && <TeamsSection />}
        {activeTab === 'virtues' && <VirtuesSection />}
        {activeTab === 'backup' && <DataBackupSection />}
        {activeTab === 'reports' && <ReportSection />}
      </div>
    </div>
  );
};
