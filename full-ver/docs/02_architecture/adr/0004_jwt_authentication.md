# ADR-0004: JWT ベースの認証アーキテクチャ

## Status

Accepted

## Context

ログイン機能の実装にあたり、セッション管理方式を決定する必要がある。主な選択肢として以下がある:

1. **Session-based (Server-side session)**: セッション ID を Cookie に保存し、サーバー側でセッションデータを管理
2. **JWT (Token-based)**: ステートレスなトークンをクライアント側で保持

### 要件

- スケーラビリティ: 複数サーバーインスタンスでの運用
- セキュリティ: OWASP 認証ガイドラインへの準拠
- パフォーマンス: 認証処理のオーバーヘッド最小化
- 運用: セッション無効化の柔軟性

## Decision

**JWT ベースの認証を採用する**（アクセストークン + リフレッシュトークン方式）

### トークン構成

| Token | Storage | Lifetime | Purpose |
|-------|---------|----------|---------|
| Access Token | Memory (JS変数) | 15分 | API 認証 |
| Refresh Token | httpOnly Cookie | 7日 | アクセストークン更新 |

### 署名アルゴリズム

**RS256 (RSA + SHA-256)** を採用

- 秘密鍵でのみ署名可能、公開鍵で検証可能
- 鍵漏洩時の影響範囲を限定（公開鍵のみ配布可能）
- 将来的なマイクロサービス化に対応

## Alternatives Considered

### 1. HS256 (HMAC + SHA-256)

**Pros:**
- 実装がシンプル
- パフォーマンスが良い

**Cons:**
- 検証にも秘密鍵が必要（全サービスで共有が必要）
- 鍵ローテーションが複雑

### 2. Server-side Session (Redis)

**Pros:**
- 即時セッション無効化が可能
- トークンサイズが小さい

**Cons:**
- Redis への依存が増える
- スケーリング時の考慮事項が増える
- セッションストアの可用性がボトルネックに

### 3. Opaque Token + Token Introspection

**Pros:**
- トークン自体に情報を含まない
- 中央集権的な管理が可能

**Cons:**
- 毎リクエストで introspection が必要
- レイテンシ増加

## Consequences

### Positive

- **スケーラビリティ**: ステートレスなため水平スケーリングが容易
- **パフォーマンス**: DB/Redis への問い合わせなしで認証可能
- **柔軟性**: RS256 により将来的なサービス分割に対応

### Negative

- **即時無効化の制限**: アクセストークンは有効期限まで有効（15分以内）
- **トークンサイズ**: セッション ID より大きい（約1KB）
- **複雑性**: リフレッシュトークンのローテーション実装が必要

### Mitigations

| Issue | Mitigation |
|-------|------------|
| 即時無効化が必要な場合 | リフレッシュトークンを DB で管理し、無効化をサポート |
| トークン漏洩 | 短い有効期限 (15分) + httpOnly Cookie |
| XSS 攻撃 | アクセストークンを localStorage に保存しない |

## Security Considerations

1. **アクセストークン**: JS 変数に保持（localStorage/sessionStorage 不可）
2. **リフレッシュトークン**: httpOnly, Secure, SameSite=Strict Cookie
3. **CSRF 対策**: SameSite Cookie + Origin ヘッダー検証
4. **レートリミット**: ログイン試行 5回/分/IP

## Implementation Notes

```typescript
// JWT Payload Structure
interface JwtPayload {
  sub: string;      // user_id
  email: string;
  iat: number;      // issued at
  exp: number;      // expiration
}

// Token Response
interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  // refreshToken is set via httpOnly cookie
}
```

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [RFC 7519 - JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
