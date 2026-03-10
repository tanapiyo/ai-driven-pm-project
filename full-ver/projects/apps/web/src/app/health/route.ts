/**
 * @what GET /health - Next.js App Router route handler
 * @why Health check endpoint for docker compose readiness probes
 *
 * Returns HTTP 200 with JSON body { status: 'ok', timestamp: ISO8601 }
 * so that docker compose healthcheck can verify the web service is ready.
 *
 * Related: Issue #130 (REPO-005) - Docker Compose web/api/db/redis setup
 */

import { NextResponse } from 'next/server';

export function GET(): NextResponse {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
