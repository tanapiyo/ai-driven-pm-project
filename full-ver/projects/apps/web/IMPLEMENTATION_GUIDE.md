# Frontend Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Feature-Sliced Design (FSD)                   │
├─────────────────────────────────────────────────────────────────┤
│  app/     →  widgets/  →  features/  →  entities/  →  shared/  │
│ (routes)    (complex)    (business)    (domain)      (utils)   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    OpenAPI Generated Types
                (@monorepo/api-contract or inline)
```

## Quick Start

### 1. Feature 構成

```
src/features/<feature-name>/
├── api/              # API呼び出し (React Query hooks)
│   ├── queries.ts    # useQuery hooks
│   ├── mutations.ts  # useMutation hooks
│   └── types.ts      # API types (from OAS or inline)
├── ui/               # React components
│   ├── FeatureForm.tsx
│   └── FeatureList.tsx
├── model/            # State & logic
│   ├── store.ts      # Zustand store (if needed)
│   └── hooks.ts      # Custom hooks
├── lib/              # Feature-specific utilities
└── index.ts          # Public API (re-exports)
```

### 2. API Layer Pattern

#### Pattern A: OAS生成クライアント使用 (推奨)

```typescript
// features/<feature>/api/queries.ts
import { useSearchArticles } from '@monorepo/api-contract';

export function useArticleSearch(params: SearchParams) {
  return useSearchArticles(params, {
    query: {
      enabled: !!params.keyword,
      staleTime: 30_000,
    },
  });
}
```

#### Pattern B: 手書きAPI呼び出し (OAS未生成時)

```typescript
// features/<feature>/api/queries.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ArticleSearchResponse, SearchParams } from './types';

async function searchArticlesApi(params: SearchParams): Promise<ArticleSearchResponse> {
  const searchParams = new URLSearchParams();
  if (params.keyword) searchParams.set('keyword', params.keyword);
  // ... params mapping

  return apiClient<ArticleSearchResponse>(`/articles?${searchParams}`);
}

export function useArticleSearch(params: SearchParams) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['articles', params],
    queryFn: () => searchArticlesApi(params),
    enabled: isAuthenticated,
  });
}
```

---

## API Integration Patterns

### Query (データ取得)

```typescript
// features/article-search/api/queries.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { ArticleSearchResponse, SearchParams } from './types';

export function useArticleSearch(params: SearchParams) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['articles', params], // キャッシュキー
    queryFn: () => apiClient<ArticleSearchResponse>(`/articles?${buildSearchParams(params)}`),
    enabled: isAuthenticated, // 認証済みのみ実行
    placeholderData: keepPreviousData, // ページネーション時のUX向上
    staleTime: 30_000, // 30秒間キャッシュ
  });
}
```

### Mutation (データ更新)

```typescript
// features/article-create/api/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import type { CreateArticleRequest, Article } from './types';

export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateArticleRequest) =>
      apiClient<Article>('/articles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // キャッシュ無効化
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: (error) => {
      // エラーハンドリング
      console.error('Failed to create article:', error);
    },
  });
}
```

### Error Handling

```typescript
// features/<feature>/ui/FeatureComponent.tsx
import { NormalizedApiError } from '@/shared/api';

export function FeatureComponent() {
  const { data, isLoading, error } = useArticleSearch(params);

  if (isLoading) return <Skeleton />;

  if (error) {
    if (error instanceof NormalizedApiError) {
      switch (error.code) {
        case 'UNAUTHORIZED':
          return <LoginPrompt />;
        case 'NOT_FOUND':
          return <NotFoundMessage />;
        default:
          return <ErrorMessage message={error.message} />;
      }
    }
    return <ErrorMessage message="予期しないエラーが発生しました" />;
  }

  return <ArticleList data={data} />;
}
```

---

## Type Definitions

### Pattern A: OAS からインポート (推奨)

```typescript
// features/<feature>/api/types.ts
export type {
  ArticleSearchResponse,
  ArticleDetail,
  CreateArticleRequest,
} from '@monorepo/api-contract';
```

### Pattern B: ローカル定義 (OAS未生成時)

```typescript
// features/<feature>/api/types.ts

/** OAS: #/components/schemas/ArticleSummary */
export interface ArticleSummary {
  id: string;
  title: string;
  imageUrl: string | null;
  tags: TagSummary[];
  viewCount: number;
}

/** OAS: #/components/schemas/ArticleSearchResponse */
export interface ArticleSearchResponse {
  articles: ArticleSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}
```

---

## Component Structure

### Container/Presenter Pattern

```tsx
// features/article-search/ui/ArticleSearchContainer.tsx
'use client';

import { useState } from 'react';
import { useArticleSearch } from '../api/queries';
import { ArticleSearchForm } from './ArticleSearchForm';
import { ArticleList } from './ArticleList';

export function ArticleSearchContainer() {
  const [params, setParams] = useState<SearchParams>({ page: 1, limit: 20 });
  const { data, isLoading, error } = useArticleSearch(params);

  return (
    <div>
      <ArticleSearchForm
        onSearch={(newParams) => setParams({ ...params, ...newParams, page: 1 })}
      />

      {isLoading && <Skeleton />}
      {error && <ErrorMessage error={error} />}
      {data && (
        <ArticleList
          articles={data.articles}
          pagination={data.pagination}
          onPageChange={(page) => setParams({ ...params, page })}
        />
      )}
    </div>
  );
}
```

```tsx
// features/article-search/ui/ArticleList.tsx (Presenter - 純粋なUI)
interface Props {
  articles: ArticleSummary[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export function ArticleList({ articles, pagination, onPageChange }: Props) {
  return (
    <div>
      <ul>
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </ul>
      <Pagination {...pagination} onChange={onPageChange} />
    </div>
  );
}
```

---

## Shared API Client

### Configuration

```typescript
// shared/api/http.ts
import { getConfig } from '@/shared/config';

export async function apiClient<T>(
  path: string,
  options: RequestInit & { baseUrl?: string } = {}
): Promise<T> {
  const config = getConfig();
  const { baseUrl = config.apiBaseUrl, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 認証トークンを自動付与
  const { useAuthStore } = await import('@/features/auth/model/store');
  const token = useAuthStore.getState().accessToken;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...fetchOptions,
    headers: { ...headers, ...fetchOptions.headers },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new NormalizedApiError(
      response.status,
      errorBody.message || `HTTP Error: ${response.status}`,
      errorBody.code,
      errorBody.details
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
```

---

## Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (protected)/          # 認証必須ルート
│   │   ├── dashboard/
│   │   │   └── page.tsx      # Container import のみ
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   └── audit-logs/
│   │   └── settings/
│   └── (auth)/               # 認証ルート
│       └── login/
│
├── features/                 # Feature Slices
│   ├── auth/
│   ├── admin-users/
│   ├── admin-audit-logs/
│   ├── settings/
│   └── ...
│
├── shared/                   # 共有レイヤー
│   ├── api/                  # HTTP client, error types
│   ├── ui/                   # Design system components
│   ├── config/               # App configuration
│   ├── hooks/                # Generic hooks
│   └── types/                # Shared type definitions
│
└── widgets/                  # Complex UI blocks (optional)
    └── ...
```

---

## Checklist

### 新しい Feature 追加時

- [ ] `src/features/<name>/` ディレクトリ作成
- [ ] `api/types.ts` - OAS の型をインポートまたは定義
- [ ] `api/queries.ts` - useQuery hooks
- [ ] `api/mutations.ts` - useMutation hooks (必要に応じて)
- [ ] `ui/*.tsx` - React components
- [ ] `index.ts` - Public API エクスポート
- [ ] `app/(protected)/<route>/page.tsx` - ルート追加

### API 変更時

- [ ] OAS 仕様の変更を確認
- [ ] `@monorepo/api-contract` 再生成 (使用している場合)
- [ ] `api/types.ts` の型を更新
- [ ] TypeScript エラーを修正
- [ ] テスト更新

---

## Related Documents

- [OpenAPI Workflow](../../docs/05_development/openapi_workflow.md)
- [API Standards](../../docs/05_development/api_standards.md)
- [FSD Architecture](../../docs/02_architecture/ARCHITECTURE.md)
