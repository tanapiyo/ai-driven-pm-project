/**
 * @layer shared
 * @segment lib
 * @what バリデーションスキーマのエクスポート
 */

export { loginSchema, registerSchema, type LoginFormData, type RegisterFormData } from './auth';

export {
  updateNameSchema,
  updatePasswordSchema,
  type UpdateNameFormData,
  type UpdatePasswordFormData,
} from './profile';
