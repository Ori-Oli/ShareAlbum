# 2026-07-04 작업 기록: 앨범 UX, 검색, 그룹 초대, 공감, 미리보기 개선

## 목표

앨범과 사진을 실제로 쓰는 화면에 가깝게 다듬었다.

- 앨범 상세 화면에서 사진을 먼저 볼 수 있게 한다.
- 사진 업로드와 앨범 생성은 화면 오른쪽 하단 `+` 버튼으로 열리게 한다.
- 그룹 초대는 별도 목록 화면보다 그룹원 리스트 안에서 처리한다.
- 초대 링크는 로컬/배포 환경에 따라 자동으로 origin이 붙게 한다.
- 앨범 사진은 태그와 제목으로 검색할 수 있게 한다.
- 사진 뷰어에 공감 버튼을 추가하고 누가 눌렀는지 확인할 수 있게 한다.
- 메인 앨범 미리보기는 목업이 아니라 실제 업로드 사진을 포토카드처럼 겹쳐 보여준다.

## 주요 변경 사항

### 1. 사진 검색 기능 추가

앨범 상세 화면의 사진 목록에서 검색 버튼/입력 흐름을 추가했다.

검색 대상:

- 사진 제목 `photo.title`
- 원본 파일명 `photo.originalName`
- 사진 태그 `photo.tags[].tag.name`

관련 파일:

- `apps/web/src/components/album-photo-grid.tsx`

구현 포인트:

- 검색어는 trim 후 소문자로 정규화한다.
- 제목이나 파일명에 검색어가 포함되면 표시한다.
- 태그 이름에 검색어가 포함되어도 표시한다.
- 검색 결과가 없을 때는 빈 상태 메시지를 보여준다.

### 2. 사진 공감 기능 추가

사진 뷰어에 하트 버튼을 추가했다.

기능:

- 현재 사용자가 하트를 누르면 공감이 추가된다.
- 다시 누르면 공감이 취소된다.
- 뷰어 하단에서 공감한 사용자 목록을 확인할 수 있다.

DB 변경:

```text
20260704000000_add_photo_likes
```

추가 테이블:

```text
photo_likes
- id
- photoId
- userId
- createdAt
```

제약:

- `photoId + userId` unique
- 같은 사용자가 같은 사진에 중복 공감할 수 없게 처리했다.
- 사진 또는 사용자가 삭제되면 공감 row도 `ON DELETE CASCADE`로 삭제된다.

추가 API:

```http
POST /api/albums/:id/photos/:photoId/likes
DELETE /api/albums/:id/photos/:photoId/likes
```

관련 파일:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260704000000_add_photo_likes/migration.sql`
- `apps/api/src/albums/albums.controller.ts`
- `apps/api/src/albums/albums.service.ts`
- `apps/web/src/components/album-photo-grid.tsx`

### 3. 사진 업로드 UI를 오른쪽 하단 `+` 버튼으로 변경

기존에는 사진 업로드 영역이 앨범 상세 화면 중앙에 크게 있었다.

문제:

- 앨범에 들어왔을 때 사진보다 업로드 박스가 먼저 눈에 들어왔다.
- 사진첩 화면인데 실제 사진 목록보다 입력 UI가 주인공처럼 보였다.

변경:

- 사진 목록을 화면의 중심으로 둔다.
- 오른쪽 하단 floating `+` 버튼을 누르면 업로드 패널이 열린다.
- 업로드 UI는 필요할 때만 표시한다.

관련 파일:

- `apps/web/src/components/album-photo-upload-launcher.tsx`
- `apps/web/src/components/album-photo-upload-form.tsx`
- `apps/web/src/app/albums/[albumId]/page.tsx`

### 4. 메인 앨범 생성 UI를 오른쪽 하단 `+` 버튼으로 변경

메인 화면의 앨범 생성도 사진 업로드와 같은 패턴으로 맞췄다.

변경:

- 메인 화면에서 항상 보이던 앨범 생성 폼을 제거했다.
- 오른쪽 하단 `+` 버튼을 누르면 앨범 생성 패널이 열린다.
- 앨범 목록을 먼저 보고, 생성은 필요할 때만 호출하는 흐름으로 바꿨다.

관련 파일:

- `apps/web/src/components/album-create-launcher.tsx`
- `apps/web/src/app/page.tsx`

### 5. 그룹 초대 UI를 그룹원 패널로 변경

처음에는 초대 링크 중심의 UI를 생각했지만, 앨범 상세에서 바로 그룹 구성원을 확인하는 방식이 더 자연스럽다고 판단했다.

변경 전:

- 초대 링크가 기능의 중심이었다.
- 그룹원이 누구인지 한눈에 보이지 않았다.

변경 후:

- 오른쪽 사이드 영역에 `그룹원` 패널을 만든다.
- 현재 그룹 멤버 목록을 먼저 보여준다.
- 패널 오른쪽 위 `+` 버튼을 누르면 초대 링크 입력/복사 영역이 열린다.

관련 파일:

- `apps/web/src/components/album-group-panel.tsx`
- `apps/web/src/app/albums/[albumId]/page.tsx`

### 6. 초대 링크 origin 자동 생성

초대 링크 앞에 `localhost`를 직접 붙이는 방식은 배포 후 도메인이 바뀌면 깨질 수 있다.

문제:

```text
/invite/:inviteCode
```

처럼 path만 있으면 사용자가 복사했을 때 완전한 링크가 아니다.

해결:

- 서버 컴포넌트에서 `headers()`를 읽는다.
- `x-forwarded-host`, `host`, `x-forwarded-proto`를 기준으로 현재 origin을 만든다.
- 로컬에서는 `http://localhost:3000` 형태가 되고, 배포 후에는 배포 도메인으로 자동 변경된다.

구현:

```ts
function getAppOrigin(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");

  return host ? `${protocol}://${host}` : "";
}
```

관련 파일:

- `apps/web/src/app/albums/[albumId]/page.tsx`
- `apps/web/src/components/album-group-panel.tsx`

### 7. 앨범 상세의 목록 이동 UI 정리

앨범 상세 화면 오른쪽에 있던 `목록으로` 버튼은 제거했다.

변경:

- 왼쪽 상단 `내 앨범` 텍스트 옆에 뒤로가기 버튼을 배치했다.
- 헤더의 내비게이션이 한곳에 모이도록 정리했다.

관련 파일:

- `apps/web/src/app/albums/[albumId]/page.tsx`

### 8. 메인 앨범 미리보기 디자인 개선

메인 화면의 앨범 카드는 실제 업로드된 사진을 사용해서 미리보기를 보여준다.

최종 방향:

- 최대 3장만 보여준다.
- 각 사진은 정사각형으로 자른다.
- 폴라로이드/포토카드처럼 흰 여백과 그림자를 준다.
- 3장이 살짝 다른 각도로 겹쳐져서 앨범 안에 여러 사진이 있다는 느낌을 준다.

현재 각도:

```text
앞 사진: rotate-3
왼쪽 뒤 사진: -rotate-12
오른쪽 뒤 사진: rotate-12
```

관련 파일:

- `apps/web/src/components/album-list.tsx`

## 시행착오

### 1. 앨범 미리보기: 10장 겹침은 과했다

처음에는 앨범 안에 사진이 많다는 느낌을 주기 위해 최대 10장까지 겹쳐 보이게 했다.

문제:

- 카드가 복잡해졌다.
- 작은 앨범 카드 안에서 사진들이 너무 많이 겹쳐 시선이 분산됐다.
- 정보 영역과 미리보기 영역의 균형이 무너졌다.

결론:

- 메인 카드에서는 많은 정보를 보여주기보다 앨범의 분위기만 전달하는 편이 낫다.
- 최종적으로 3장 미리보기로 되돌렸다.

### 2. 앨범 미리보기: 3D 책더미 표현은 현재 카드 목적과 맞지 않았다

책을 쌓아 둔 것처럼 3차원 스택을 시도했다.

문제:

- 카드 안의 사진첩 미리보기보다 별도 오브젝트처럼 보였다.
- 사용자가 원한 것은 최종적으로 “사진들이 들어 있는 폴라로이드형 앨범 카드”에 더 가까웠다.
- 3D 원근을 주면 실제 사진 썸네일을 확인하기 어려워졌다.

결론:

- 3D 두께 표현은 제거했다.
- 정사각형 사진 3장을 포토카드처럼 겹치는 방식으로 정리했다.

### 3. 초대 링크는 path만 저장하고, 표시할 때 origin을 붙이는 방식이 적절했다

처음 고민:

- 초대 링크 앞에 `localhost://` 같은 값을 직접 붙여야 하는지 고민했다.

정리:

- DB/API에서는 `/invite/:inviteCode` 같은 path 중심으로 유지한다.
- 프론트에서 표시/복사할 때 현재 요청의 origin을 붙인다.
- 이렇게 해야 로컬, 배포, 커스텀 도메인 환경을 모두 같은 코드로 처리할 수 있다.

### 4. 그룹 초대는 별도 기능보다 그룹원 리스트 안에 있는 편이 자연스러웠다

처음에는 초대 링크 생성 기능을 전면에 둘 수 있었다.

문제:

- 사용자는 링크보다 “이 앨범에 누가 들어와 있는지”를 먼저 확인하고 싶을 가능성이 크다.
- 초대는 그룹 관리의 하위 동작이다.

결론:

- `그룹원` 목록을 먼저 보여준다.
- 초대 링크는 `+` 버튼으로 열리는 보조 UI로 둔다.

### 5. zsh에서 대괄호가 들어간 Next.js 라우트 파일은 따옴표가 필요하다

작업 중 아래 명령이 실패했다.

```bash
sed -n '1,130p' apps/web/src/app/albums/[albumId]/page.tsx
```

오류:

```text
zsh: no matches found: apps/web/src/app/albums/[albumId]/page.tsx
```

원인:

- zsh가 `[albumId]`를 glob 패턴으로 해석했다.

해결:

```bash
sed -n '1,130p' 'apps/web/src/app/albums/[albumId]/page.tsx'
```

대괄호가 들어간 Next.js app router 경로는 shell 명령에서 따옴표로 감싸는 것이 안전하다.

## 검증

오늘 마지막 UI 조정 후 아래 명령을 실행했다.

```bash
/Users/junho/Library/pnpm/pnpm --filter web typecheck
/Users/junho/Library/pnpm/pnpm --filter web lint
```

결과:

```text
typecheck 통과
lint 통과
```

주의:

- 현재 환경에서는 기본 `pnpm` 대신 `/Users/junho/Library/pnpm/pnpm`을 사용했다.
- 기본 `pnpm`이 Codex 런타임 쪽 버전으로 잡히면 `node_modules` 관련 prompt가 뜰 수 있다.

## 다음에 이어서 볼 포인트

- 앨범 미리보기 각도는 현재보다 더 키우면 재미는 있지만 썸네일 가독성이 떨어질 수 있다.
- 그룹원 패널에는 나중에 멤버 제거, 권한 변경, 초대 링크 재생성 기능을 붙일 수 있다.
- 공감 기능은 현재 사진 단위이므로, 나중에 알림이나 인기 사진 정렬로 확장할 수 있다.
- 검색은 현재 클라이언트 필터링이다. 사진이 많아지면 서버 검색 API로 옮기는 것이 좋다.
