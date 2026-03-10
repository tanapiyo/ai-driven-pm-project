/**
 * @what ガードレールのインデックス
 * @why 全ガードレールを一括でインポート・実行できるようにする
 */

// Clean Architecture (API) 用ガードレール
export { checkRepositoryResult } from './repository-result.js';
export { checkDomainEventCausation } from './domain-event-causation.js';
export { checkOpenapiRouteCoverage } from './openapi-route-coverage.js';
export { checkValueObjectImmutability } from './value-object-immutability.js';
export { checkUsecaseDependency } from './usecase-dependency.js';
export { checkDomainPurity } from './domain-purity.js';

// Feature-Sliced Design (Web) 用ガードレール
export { checkFsdPublicApi } from './fsd-public-api.js';
export { checkFsdLayerDependency } from './fsd-layer-dependency.js';
export { checkFsdOpenapiCoverage } from './fsd-openapi-coverage.js';
