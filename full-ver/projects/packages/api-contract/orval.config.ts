/**
 * Orval Configuration
 *
 * @what OpenAPI から TypeScript クライアントを生成する設定
 * @why 型安全な API 呼び出しを実現し、手書きの型定義を排除する
 *
 * 生成物:
 * - src/generated/api.ts: API クライアント関数
 * - src/generated/api.schemas.ts: リクエスト/レスポンス型
 */

import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: './openapi.yaml',
    output: {
      mode: 'tags-split',
      target: './src/generated/api.ts',
      schemas: './src/generated/schemas',
      client: 'fetch',
      baseUrl: false, // 実行時に設定する
      override: {
        mutator: {
          path: './src/http-client.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
