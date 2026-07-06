# 2026-07-02 작업 기록: 사진 AI 태그, 태그 구조 정규화, 사진 뷰어

## 목표

앨범 기능을 실제 사용 가능한 사진 관리 흐름으로 확장했다.

- 사진 업로드 후 AI가 자동으로 한국어 태그를 생성한다.
- 태그를 나중에 검색/수동 관리할 수 있도록 DB 구조를 정규화한다.
- 앨범 상세에서 사진을 전체화면으로 볼 수 있는 뷰어를 만든다.
- 뷰어에서 사진 이름, 설명, 태그를 편집할 수 있게 한다.
- 앨범 화면의 사진 카드에서는 태그를 최대 3개만 보여준다.

## 주요 변경 사항

### 1. AI 태그 생성 기능 추가

사진 업로드 후 비동기로 AI 태그 생성이 실행되도록 구현했다.

처리 흐름:

1. 사용자가 사진을 업로드한다.
2. API가 Supabase Storage에 사진을 저장한다.
3. `photos` 테이블에 사진 row를 생성한다.
4. `PhotoTaggingService`가 비동기로 Gemini에 이미지 URL을 전달한다.
5. Gemini가 한국어 태그 3개를 반환한다.
6. 태그를 DB에 저장하고 사진의 `aiStatus`를 `READY`로 변경한다.

사진 상태 필드:

- `PENDING`: 태그 생성 중
- `READY`: 태그 생성 완료
- `FAILED`: 태그 생성 실패

관련 파일:

- `apps/api/src/albums/photo-tagging.service.ts`
- `apps/api/src/albums/albums.service.ts`
- `apps/api/prisma/schema.prisma`
- `apps/web/src/components/album-photo-grid.tsx`

## OpenAI에서 Gemini로 변경

처음에는 OpenAI Vision API로 구현했지만, 테스트 중 OpenAI 계정 quota 문제가 발생했다.

오류:

```text
429 You exceeded your current quota, please check your plan and billing details.
```

이후 사용자가 Gemini API 키를 발급해서 `.env.local`에 추가했고, OpenAI SDK 의존성을 제거한 뒤 Gemini REST API 방식으로 변경했다.

환경변수:

```env
GEMINI_API_KEY=
GEMINI_VISION_MODEL=gemini-3.5-flash
```

Gemini 테스트 결과:

```text
upload status: 201
initial aiStatus: PENDING
poll 8: READY 나무, 태양, 하늘
cleanup status: 200
```

## 트러블슈팅

### 1. OpenAI quota 오류

문제:

- 사진 업로드와 DB 저장은 성공했다.
- OpenAI 호출 단계에서 `429 quota exceeded`가 발생했다.

원인:

- OpenAI 계정의 결제/크레딧/사용량 제한 문제.

해결:

- OpenAI SDK 제거.
- Gemini REST API로 교체.
- `.env.example`도 Gemini 기준으로 수정.

### 2. Gemini 응답 구조 불일치

처음에는 Gemini 응답에 `output_text`가 있을 것으로 예상했다.

실제 응답:

```json
{
  "steps": [
    {
      "type": "model_output",
      "content": [
        {
          "type": "text",
          "text": "[\"나무\", \"태양\", \"풍경\"]"
        }
      ]
    }
  ]
}
```

해결:

- `steps[].type === "model_output"`을 찾고,
- 그 안의 `content[].type === "text"` 값을 파싱하도록 수정했다.

### 3. 테스트 이미지 오류

처음 테스트에 사용한 base64 PNG가 Gemini/OpenAI에서 유효 이미지로 인식되지 않았다.

오류:

```text
The image data you provided does not represent a valid image.
```

해결:

- 테스트용 PPM 이미지를 만들고 macOS `sips`로 PNG 변환.
- 정상 PNG로 업로드 테스트를 다시 진행했다.

### 4. Next.js 화면에서 태그 구조 오류

태그 DB를 정규화한 직후 프론트가 예전 구조와 새 구조를 혼동해서 아래 오류가 발생했다.

```text
Cannot read properties of undefined (reading 'name')
```

원인:

- 기존에는 `photo.tags[].name` 구조였다.
- 정규화 후에는 `photo.tags[].tag.name` 구조가 되었다.

해결:

- API include에 `tag: true`를 추가했다.
- 프론트 타입을 새 구조로 수정했다.
- 태그명이 없으면 렌더링하지 않도록 방어 코드를 추가했다.

## DB 구조 변경

### 1. AI 태그 상태 추가

마이그레이션:

```text
20260702000000_add_photo_ai_tags
```

추가된 필드:

- `photos.aiStatus`
- `photos.aiError`
- `photo_tags`

### 2. 태그 정규화

초기 구조는 `photo_tags.name`에 문자열 태그를 직접 저장했다.

문제:

- 같은 태그 문자열이 사진마다 중복 저장된다.
- 태그 검색, 자동완성, 인기 태그, 태그 이름 관리가 어려워진다.
- AI 태그와 사용자 태그 구분이 어렵다.

변경 후 구조:

```text
tags
- id
- name
- createdAt

photo_tags
- id
- photoId
- tagId
- source
- createdBy
- createdAt
```

`source`:

- `AI`: Gemini가 생성한 태그
- `USER`: 사용자가 직접 추가한 태그

마이그레이션:

```text
20260702010000_normalize_photo_tags
```

기존 `photo_tags.name` 데이터는 `tags.name`으로 옮기고, `photo_tags.tagId`로 연결되도록 처리했다.

### 3. 사진 메타데이터 추가

사진 뷰어에서 이름과 설명을 편집할 수 있도록 `photos`에 컬럼을 추가했다.

마이그레이션:

```text
20260702020000_add_photo_metadata
```

추가된 필드:

- `photos.title`
- `photos.description`

`originalName`은 업로드 당시 파일명을 보존하고, 사용자가 바꾸는 이름은 `title`에 저장한다.

## API 추가

사진 뷰어 편집을 위해 아래 API를 추가했다.

```http
PATCH /api/albums/:id/photos/:photoId
POST /api/albums/:id/photos/:photoId/tags
DELETE /api/albums/:id/photos/:photoId/tags/:photoTagId
```

역할:

- `PATCH`: 사진 이름과 설명 수정
- `POST tags`: 수동 태그 추가
- `DELETE tags`: 사진에서 태그 제거

권한:

- 사진 삭제는 기존처럼 앨범 owner만 가능하다.
- 사진 이름/설명/태그 편집은 앨범 접근 권한이 있는 사용자(owner 또는 그룹 멤버)가 가능하게 구현했다.

## 사진 뷰어 추가

앨범 상세 페이지에서 사진을 클릭하면 전체화면 뷰어가 열린다.

뷰어에서 보여주는 정보:

- 큰 사진
- 올린 사람
- 올린 시간
- 태그
- 사진 이름
- 사진 설명

뷰어 동작:

- `닫기` 버튼으로 닫기
- `Esc` 키로 닫기
- 뷰어가 열린 동안 배경 스크롤 잠금
- 삭제 모드에서는 사진 클릭 대신 기존 삭제 선택 토글만 동작

편집 기능:

- 이름 변경
- 설명 작성/수정
- 태그 추가
- 태그 삭제

저장/추가/삭제 후:

- 뷰어 내부 데이터 즉시 갱신
- `router.refresh()`로 앨범 화면도 갱신

관련 파일:

- `apps/web/src/components/album-photo-grid.tsx`
- `apps/web/src/lib/api.ts`

## 태그 표시 정책 변경

앨범 상세의 사진 카드에서는 태그를 최대 3개까지만 보여주도록 변경했다.

이유:

- 사진 카드가 태그로 너무 길어지는 것을 방지한다.
- 전체 태그 관리는 사진 뷰어 안에서 가능하다.

뷰어의 태그 편집 영역은 삭제/관리를 위해 전체 태그를 보여준다.

## 실제 테스트 결과

### Gemini 자동 태그 생성

```text
upload status: 201
initial aiStatus: PENDING
poll 10: READY 나무, 태양, 하늘
cleanup status: 200
```

### 사진 뷰어 편집 API

```text
upload: 201
patch: 200 변경한 사진 이름 뷰어에서 작성한 설명입니다.
add tag: 201 true
delete tag: 200 true
cleanup: 200
```

## 실행한 검증 명령

```bash
pnpm --filter api typecheck
pnpm --filter web typecheck
pnpm --filter api lint
pnpm --filter web lint
pnpm --filter api test
```

모두 통과했다.

## 최종 상태

현재 가능한 기능:

- 앨범 생성
- 사진 업로드
- Supabase Storage 저장
- Gemini 자동 태그 생성
- 태그 DB 정규화 저장
- 앨범/사진 삭제
- 사진 전체화면 뷰어
- 사진 이름 변경
- 사진 설명 작성
- 수동 태그 추가
- 태그 삭제
- 사진 카드 태그 최대 3개 표시

## 다음 작업 후보

- 태그별 사진 검색
- 앨범 내 태그 필터
- 태그 자동완성
- 사용자별 태그 편집 권한 세분화
- 사진 설명/이름 변경 이력 관리
- 태그 source별 UI 구분
