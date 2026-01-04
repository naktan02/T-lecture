export type Token =
  | { type: 'text'; text: string }
  | { type: 'newline' }
  | { type: 'var'; key: string } // {{key}}
  | { type: 'format'; key: string; format: string }; // {{key:format=...}}

export type VariableDef = {
  key: string; // "locations" / "self.schedules" ...
  label: string;
  icon?: string;
  isFormat?: boolean;
  category?: string; // 카테고리 ID
  skipModal?: boolean; // 포맷 변수여도 모달 없이 바로 삽입
  defaultFormat?: string; // 모달 없이 삽입 시 사용할 기본 포맷
};

export type VariableCategory = {
  id: string;
  label: string;
  icon: string;
  color: string;
};

export type VariableRegistry = {
  list: () => VariableDef[];
  get: (key: string) => VariableDef | undefined;
  normalizeKey: (key: string) => string;
  categories?: () => VariableCategory[];
};
