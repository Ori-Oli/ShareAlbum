# OAuth Login Troubleshooting

이 문서는 2026-06-26에 네이버/카카오 소셜 로그인 문제를 확인하면서 정리한 작업 내역과 시행착오를 기록한다.

## 현재 로그인 구조

- 프론트엔드 로그인 버튼은 `apps/web/src/lib/auth/providers.ts`의 `getProviderLoginUrl()`을 통해 API 로그인 URL로 이동한다.
- API 로그인 시작점은 `GET /api/auth/:provider/login`이다.
- API 콜백 주소는 `GET /api/auth/:provider/callback`이다.
- NestJS API 서버는 `apps/api/src/main.ts`에서 전역 prefix로 `api`를 사용한다.
- 따라서 로컬 카카오 Redirect URI는 아래 값이다.

```text
http://localhost:4000/api/auth/kakao/callback
```

관련 환경변수:

```env
API_BASE_URL=http://localhost:4000/api
WEB_ORIGIN=http://localhost:3000
KAKAO_REDIRECT_URI=http://localhost:4000/api/auth/kakao/callback
NAVER_REDIRECT_URI=http://localhost:4000/api/auth/naver/callback
```

## 작업 요약

### 1. 카카오 Redirect URI 오류 확인

증상:

```text
카카오 로그인을 누르면 redirect url를 잘못 등록했다는 오류가 표시됨
```

확인한 코드:

- `apps/api/src/auth/social-auth.service.ts`
  - 카카오 authorization URL 생성 시 `KAKAO_REDIRECT_URI`를 `redirect_uri`로 전달한다.
- `apps/api/src/auth/auth.controller.ts`
  - 콜백 라우트는 `:provider/callback`이다.
- `apps/api/src/main.ts`
  - 전역 prefix가 `api`이다.

결론:

- Kakao Developers에 등록해야 하는 값은 프론트 주소가 아니라 API 콜백 주소다.
- 로컬 기준으로 `http://localhost:4000/api/auth/kakao/callback`를 등록해야 한다.
- Kakao Developers의 등록값과 코드가 보내는 `redirect_uri`는 scheme, host, port, path까지 정확히 같아야 한다.

### 2. 카카오 authorization code 교환 실패 확인

증상:

```text
Error: Failed to exchange kakao authorization code.
```

의미:

- 카카오 로그인 화면은 통과했다.
- API 서버가 콜백으로 받은 `code`를 access token으로 교환하는 단계에서 실패했다.

시행착오:

- 처음에는 코드가 카카오의 실제 에러 응답을 버리고 있었다.
- 그래서 `response.ok`가 false일 때 HTTP status와 response body를 에러 메시지에 포함하도록 수정했다.

수정 위치:

- `apps/api/src/auth/social-auth.service.ts`

수정 의도:

- `invalid_grant`, `invalid_client`, `KOE010` 같은 카카오의 실제 원인 메시지를 로그에서 확인할 수 있게 한다.

점검 포인트:

- Kakao Developers에서 Client Secret 사용이 켜져 있으면 `KAKAO_CLIENT_SECRET` 값을 넣어야 한다.
- Client Secret을 사용하지 않는 설정이면 `.env`의 `KAKAO_CLIENT_SECRET`은 비워도 된다.
- OAuth `code`는 1회용이므로 실패 후 콜백 URL을 새로고침하지 말고 `/login`에서 다시 시작해야 한다.

### 3. DB email unique constraint 오류와 정책 변경

증상:

```text
PrismaClientKnownRequestError: Unique constraint failed on the fields: (`email`)
code: P2002
constraint: users_email_key
```

원인:

- 네이버 로그인으로 같은 이메일의 `User`가 이미 생성되어 있었다.
- 이후 카카오 로그인으로 같은 이메일의 새 `User`를 만들려고 하면서 `users.email` unique 제약에 걸렸다.

기존 로직:

- `provider + providerId` 기준으로만 `upsert`했다.
- 같은 이메일의 다른 provider 계정이 이미 있어도 새 사용자 생성을 시도했다.

처음 시도한 수정:

1. `provider + providerId`로 기존 소셜 계정을 찾는다.
2. 있으면 해당 사용자 프로필을 업데이트하고 로그인한다.
3. 없고 이메일이 있으면 같은 `email`의 기존 사용자를 찾는다.
4. 같은 이메일 사용자가 있으면 새 사용자를 만들지 않고 그 사용자에 현재 `provider/providerId`를 연결한다.
5. 둘 다 없으면 새 사용자를 생성한다.

이 방식의 문제:

- 같은 이메일을 사용하는 네이버 계정과 카카오 계정이 하나의 `User`로 합쳐진다.
- 현재 `users` 테이블은 `provider/providerId`를 한 쌍만 저장하므로, 다른 플랫폼으로 로그인하면 기존 provider 정보가 새 provider 정보로 덮인다.
- 그 결과 DB에서 기존 사용자가 사라진 것처럼 보인다. 실제로는 행이 삭제된 것이 아니라 같은 `id`의 사용자 행이 다른 플랫폼 정보로 업데이트된 것이다.

최종 정책:

- 같은 이메일이어도 가입 플랫폼이 다르면 별도 사용자로 둔다.
- 사용자는 `id`로 구별하고, 소셜 로그인 계정은 `provider + providerId` 조합으로 구별한다.
- `email`은 식별자가 아니라 프로필 정보로만 취급한다.

최종 수정한 로직:

1. `provider + providerId`로 기존 소셜 계정을 찾는다.
2. 있으면 해당 사용자 프로필을 업데이트하고 로그인한다.
3. 없으면 이메일이 같더라도 새 사용자를 생성한다.

DB 변경:

- `User.email`의 Prisma `@unique`를 제거했다.
- 기존 DB의 `users_email_key` unique index를 제거하는 마이그레이션을 추가했다.

수정 위치:

- `apps/api/src/auth/social-auth.service.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260627000000_allow_same_email_across_oauth_providers/migration.sql`

검증:

```bash
pnpm --filter api typecheck
pnpm --filter api test
```

둘 다 통과했다.

## 현재 사용자 식별 방식

현재 `User` 모델의 기본 식별자는 `id`다.

소셜 로그인 시 사용자를 찾는 보조 식별자는 아래 조합이다.

```text
provider + providerId
```

예:

```text
KAKAO + 카카오 회원 ID
NAVER + 네이버 회원 ID
```

현재 로그인 처리 순서:

1. `provider + providerId`가 이미 있으면 해당 사용자로 로그인한다.
2. 없으면 같은 `email`의 사용자가 있어도 새 사용자를 만든다.
3. `email`은 로그인 계정 병합에 사용하지 않는다.

## 현재 구조의 한계

현재 DB 모델은 플랫폼별 사용자를 별도 `User` 행으로 저장한다.

```prisma
model User {
  id         String
  email      String?
  provider   OAuthProvider?
  providerId String?
}
```

이 구조에서는 같은 이메일의 네이버 사용자와 카카오 사용자가 서로 다른 `User.id`를 가진다. 플랫폼별 데이터를 완전히 분리하려는 현재 정책에는 맞다.

다만 “한 사람에게 여러 로그인 수단을 연결”하는 계정 연결 기능을 만들려면 이 구조로는 부족하다. 그때는 아래처럼 분리하는 편이 좋다.

장기 확장 구조:

```text
users
- id
- email
- displayName
- avatarUrl

oauth_accounts
- id
- userId
- provider
- providerId
```

이 구조의 장점:

- 한 `User`가 여러 OAuth 계정을 가질 수 있다.
- `NAVER`, `KAKAO`, `GOOGLE` 같은 provider를 추가해도 사용자 본문 데이터와 로그인 계정 데이터를 분리할 수 있다.
- provider별 고유 ID를 안정적으로 unique 처리할 수 있다.

## 재발 시 체크리스트

### Redirect URI 오류

- Kakao Developers에 아래 값이 등록되어 있는지 확인한다.

```text
http://localhost:4000/api/auth/kakao/callback
```

- `.env.local` 또는 `.env`의 `KAKAO_REDIRECT_URI` 값이 같은지 확인한다.
- 환경변수 변경 후 API 서버를 재시작한다.

### Token exchange 오류

- API 로그에서 `Status:`와 `Response:`를 확인한다.
- Client Secret 설정이 Kakao Developers와 `.env`에서 일치하는지 확인한다.
- 실패한 콜백 URL을 새로고침하지 말고 로그인 플로우를 처음부터 다시 시작한다.

### DB unique constraint 오류

- `users.email` unique 제약이 남아 있는지 확인한다.
- `apps/api/prisma/schema.prisma`에서 `email String?`이어야 하며 `@unique`가 없어야 한다.
- DB에 `users_email_key` unique index가 남아 있으면 마이그레이션을 적용한다.
- 현재 정책에서는 같은 이메일 사용자가 있어도 provider가 다르면 별도 사용자로 생성한다.

## 관련 파일

- `apps/web/src/lib/auth/providers.ts`
- `apps/api/src/main.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/social-auth.service.ts`
- `apps/api/prisma/schema.prisma`
