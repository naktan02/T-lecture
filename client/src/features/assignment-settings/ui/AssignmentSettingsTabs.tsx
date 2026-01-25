// client/src/features/assignment-settings/ui/AssignmentSettingsTabs.tsx
import { useState, ReactElement } from 'react';
import { AssignmentSettingsSection } from './AssignmentSettingsSection';
import { PenaltyManagementSection } from './PenaltyManagementSection';
import { PriorityCreditSection } from './PriorityCreditSection';
import { TemplatesSection } from '../../settings/ui/TemplatesSection';

type TabKey = 'settings' | 'penalty' | 'priority' | 'templates';

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { key: 'settings', label: '배정 설정', icon: '⚙️' },
  { key: 'penalty', label: '배정 패널티', icon: '⚠️' },
  { key: 'priority', label: '우선배정', icon: '✨' },
  { key: 'templates', label: '메시지 템플릿', icon: '✉️' },
];

export const AssignmentSettingsTabs = (): ReactElement => {
  const [activeTab, setActiveTab] = useState<TabKey>('settings');

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
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'settings' && <AssignmentSettingsSection />}
        {activeTab === 'penalty' && <PenaltyManagementSection />}
        {activeTab === 'priority' && <PriorityCreditSection />}
        {activeTab === 'templates' && <TemplatesSection />}
      </div>
    </div>
  );
};
