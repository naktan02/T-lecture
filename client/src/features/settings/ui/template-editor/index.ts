// features/settings/ui/template-editor/index.ts
// 템플릿 에디터 컴포넌트 barrel export

// 컴포넌트
export { TemplateEditor } from './TemplateEditor';
export { VariablePanel } from './VariablePanel';
export { VariableChip } from './VariableChip';
export { FormatVariableModal } from './FormatVariableModal';

// 훅
export { useTemplateEditor } from './useTemplateEditor';

// 설정
export { variableConfig, variableCategories, formatPlaceholders } from './registry';

// 유틸리티
export * from './styles';
export * from './utils';
export * from './parse';
export * from './sample';

// 타입
export * from './types';
