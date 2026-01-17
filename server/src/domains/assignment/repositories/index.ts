// server/src/domains/assignment/repositories/index.ts
// Repository 통합 export

export { assignmentQueryRepository } from './assignment-query.repository';
export { assignmentCommandRepository } from './assignment-command.repository';
export { assignmentConfigRepository } from './assignment-config.repository';

export * from './types';

// 기존 코드 호환성을 위한 기본 export
// 서비스에서 `import assignmentRepository from '../repositories'` 형태로 사용
export { assignmentQueryRepository as default } from './assignment-query.repository';
