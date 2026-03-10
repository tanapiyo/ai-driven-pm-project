/**
 * @what 認証ユースケースのエクスポート
 */

export { LoginUseCase, type LoginInput, type LoginOutput, type LoginError } from './login.js';

export { LogoutUseCase, type LogoutInput, type LogoutError } from './logout.js';

export {
  RefreshTokenUseCase,
  type RefreshTokenInput,
  type RefreshTokenOutput,
  type RefreshTokenError,
} from './refresh-token.js';

export {
  GetCurrentUserUseCase,
  type GetCurrentUserInput,
  type GetCurrentUserOutput,
  type GetCurrentUserError,
} from './get-current-user.js';

export { canAccessUnitData, canAccessUserData, isUnitManager } from './authorization-helpers.js';

export type { AuthorizedContext } from './authorized-context.js';
