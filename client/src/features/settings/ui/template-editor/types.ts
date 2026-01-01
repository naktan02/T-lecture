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
