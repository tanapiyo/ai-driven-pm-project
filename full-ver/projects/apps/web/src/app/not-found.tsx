/**
 * @layer app
 * @what カスタム 404 ページ
 */

// Force dynamic rendering to avoid SSG issues
export const dynamic = 'force-dynamic';

import { dictionary } from '@/shared/lib';

const notFound = dictionary.error.notFound;

export default function NotFound() {
  return (
    <main>
      <h1>{notFound.title}</h1>
      <p>{notFound.description}</p>
    </main>
  );
}
