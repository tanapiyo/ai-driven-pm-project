/**
 * @layer shared
 * @segment config
 * @what アプリケーション設定の集約
 *
 * process.env の直接参照を禁止し、このモジュール経由で取得する
 */
export { getConfig, type AppConfig } from './env';
