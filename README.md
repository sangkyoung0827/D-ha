# Diha · 디하

Diha(디하)는 반려동물의 산책, 영양, 건강 루틴을 디지털 펫 게임과 연결하는 디지털 펫 헬스 플랫폼입니다. DHA는 플랫폼의 첫 번째 주요 영양 카테고리이며, 게임 속 효과와 실제 참고 정보는 명확히 구분합니다.

## 현재 구현 범위

- 선글라스를 쓴 캡슐 Diha의 첫 인사와 강아지 5종·고양이 5종을 고르는 반려동물 온보딩
- 이름, 털 색상, 무늬, 목걸이, 모자, 안경·액세서리, 의상을 반영하는 반려동물 커스터마이징
- 캐릭터 설정 직후 Google 로그인, Firebase Auth 세션 유지, 설정 화면의 계정·동기화 상태와 로그아웃
- Google UID별 Firestore 클라우드 저장과 UID별 IndexedDB/localStorage 로컬 복사본
- 포만감·청결·에너지·즐거움·컨디션의 시간 경과 및 최대 24시간 오프라인 계산
- Home에 통합된 집 공간, Ocean, 반려동물 영양 상점과 Ocean 전용 게임 허브
- 밥·영양제·운동·에너지 4개 상태 HUD와 선택한 반려동물의 생동감 있는 동작
- 기기 픽셀 비율을 최대 2배까지 반영하는 HiDPI Phaser 렌더링과 고해상도 텍스트·파티클
- 해변→파도→해저 동굴→심해로 이어지는 Ocean Run과 우주까지 오르는 Jump Up
- 실제 해변 사진의 구도와 질감을 참고해 새로 생성한 2× 해상도 전용 백사장·청록 바다 배경
- Ocean Run과 Jump Up의 DHA 게이지, 시야 회복, 계정별 최고 기록
- 코인, XP, 레벨, 해금, 39개 아이템, 의상 장착, 4개 방 테마
- 12개 업적, 일일 목표, 연속 방문, 로컬 데모 친구
- 계정별 IndexedDB 저장, 동기 localStorage 미러, Zod 검증, v1/v2/v3→v4 마이그레이션, JSON 내보내기·가져오기
- 설치 버튼, iOS 홈 화면 추가 안내, 업데이트 배너, 오프라인 앱 셸을 갖춘 PWA
- JavaScript 없이도 읽히는 브랜드 공개 페이지, canonical, JSON-LD, sitemap, robots
- 사운드·진동·알림·음성 에코 어댑터와 접근성용 Canvas 외부 컨트롤

## 실행 방법

Node.js 22 이상과 pnpm이 필요합니다.

```bash
pnpm install
pnpm dev
```

기본 개발 주소는 `http://localhost:5173`입니다.

## 테스트와 빌드

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm preview
```

E2E 최초 실행 전 Chromium이 없다면 `pnpm exec playwright install chromium`을 한 번 실행합니다. Playwright는 데스크톱 Chromium과 Pixel 7 프로필을 모두 검사합니다.

## 게임 조작

- 화면 아래 메뉴로 Home, Ocean, 상점을 이동합니다.
- Home에서는 반려동물을 쓰다듬고 동물병원, 펫 일기, 펫의 탐험, 미용실, 영양 추천을 엽니다.
- Ocean의 Games에서 Ocean Run과 Jump Up을 선택합니다. 레인 이동은 좌우 키와 스와이프를 지원합니다.
- 반려동물을 터치하면 표정과 작은 모션으로 반응합니다.

## 주요 폴더 구조

```text
src/app              React 앱 조립
src/components       온보딩·게임 UI·설정
src/domain           상태·경제·성장·업적·아이템 순수 로직
src/game             Phaser 엔티티·Scene·명시적 bridge
src/minigames        지연 로딩 미니게임 정의
src/platform         인증·클라우드 저장·알림·소셜·웰니스·제품·오디오 어댑터
src/store            Zustand, IndexedDB, 검증·마이그레이션
src/test             Vitest 단위 테스트
e2e                  Playwright 사용자 흐름
```

## 저장 방식

로그인 전 생성 데이터는 기존 설치와 호환되는 `diha-keeper` IndexedDB의 `game-save/primary` 레코드에 임시 저장됩니다. Google 로그인 후에는 `game-save/user:{uid}`와 `diha-save-v5:user:{uid}`로 분리되며, Firestore의 `users/{uid}/game/primary` 문서와 동기화됩니다. 최초 로그인에만 기존 `primary` 저장을 해당 UID로 옮기고 게스트 원본을 제거하므로 다음 계정으로 데이터가 넘어가지 않습니다.

같은 계정의 로컬·클라우드 저장이 모두 있으면 `lastSavedAt`이 최신인 유효본을 선택합니다. 네트워크 장애 중에도 UID별 로컬 복사본에 먼저 저장하고 다음 연결 시 클라우드에 반영합니다. 모든 클라우드·가져오기·이전 버전 데이터는 Zod v4 스키마를 통과해야 하며, 손상 데이터는 초기화 전 다운로드 가능한 백업으로 남깁니다.

Firebase 프로젝트는 `d-ha-game`, Firestore 기본 데이터베이스는 서울 `asia-northeast3` Standard이며 삭제 보호를 사용합니다. `firestore.rules`는 인증된 사용자가 자신의 UID 문서만 읽고 쓰도록 제한합니다. Firebase 웹 설정값은 공개 식별자이며 실제 접근 권한은 Firebase Authentication과 Firestore Security Rules가 통제합니다.

## Firebase 관리

보안 규칙을 변경한 뒤에는 다음 명령으로 Diha 전용 프로젝트에만 배포합니다.

```bash
npx firebase-tools deploy --only firestore --project d-ha-game
```

Google 제공자는 Firebase Authentication에서 활성화되어 있으며 공식 주소 `d-ha.vercel.app`이 허용 도메인에 등록되어 있습니다. 다른 Firebase 프로젝트를 이 저장소의 배포 대상으로 사용하지 않습니다.

## PWA 설치

공식 주소 또는 로컬 HTTPS 환경에서 설치할 수 있습니다. 앱 셸과 핵심 정적 리소스를 미리 캐시하며, 새 버전이 있으면 사용자가 `업데이트`를 눌렀을 때 최신 서비스 워커로 전환합니다.

### Android / Desktop Chromium

Chrome 또는 Edge에서 공식 주소를 연 뒤 앱에 나타나는 `Diha 설치하기` 버튼을 누릅니다. 설치 이벤트를 지원하지 않으면 브라우저 메뉴의 `앱 설치`를 이용합니다.

### iPhone / iPad

Safari에서 공식 주소를 열고 `공유 → 홈 화면에 추가 → 추가`를 선택합니다. 앱의 설치 안내 버튼에서도 같은 절차를 확인할 수 있습니다.

설치된 아이콘을 누르면 주소 표시줄 없는 standalone 모드로 현재 계정과 펫 상태를 불러옵니다. 온보딩이나 로그인이 끝나지 않았다면 해당 단계부터 이어집니다.

## SEO 구조

- 브랜드 title: `Diha 디하 | 디지털 펫 헬스 플랫폼`
- 공식 canonical: `https://d-ha.vercel.app/`
- 공개 페이지: `/about`, `/dog`, `/cat`, `/pet-health`, `/dha`, `/app`, `/privacy`, `/terms`, `/support`
- sitemap: [https://d-ha.vercel.app/sitemap.xml](https://d-ha.vercel.app/sitemap.xml)
- robots: [https://d-ha.vercel.app/robots.txt](https://d-ha.vercel.app/robots.txt)
- 소유권 인증 환경변수: `VITE_GOOGLE_SITE_VERIFICATION`, `VITE_NAVER_SITE_VERIFICATION`

### Google Search Console 등록

1. 공식 Production URL을 Search Console에 등록합니다.
2. 발급된 verification token을 Vercel 환경변수에 넣고 재배포합니다.
3. `sitemap.xml`을 제출합니다.
4. 홈페이지 URL 검사를 실행하고 색인 생성을 요청합니다.

### Naver Search Advisor 등록

1. 공식 Production URL을 사이트로 등록합니다.
2. 발급된 token을 Vercel 환경변수에 넣고 재배포합니다.
3. `sitemap.xml`을 제출하고 수집 상태를 확인합니다.

계정 로그인이 필요한 단계는 자동화하지 않습니다. 전체 수동 점검은 [MANUAL_RELEASE_CHECKLIST.md](./MANUAL_RELEASE_CHECKLIST.md)를 따릅니다.

## 데모 모드

`/?debug=1`에서 오른쪽 `DEV` 탭을 엽니다. 상태 조절, 1시간·1일·3일 경과, 오프라인 복귀, 코인·레벨, 전체 아이템, 업적 초기화, 인앱 알림, 애니메이션, 저장 시각을 실제 도메인 경로로 시험할 수 있습니다.

## Production URL

[https://d-ha.vercel.app](https://d-ha.vercel.app)

## 알려진 제한

- 실제 사용자 친구와 서버 Push는 아직 없습니다.
- 음성 에코는 브라우저 `MediaRecorder`와 Web Audio 지원 범위에서만 동작하며 녹음을 저장하지 않습니다.
- Phaser가 초기 게임 화면에 필요해 vendor 청크가 크지만, 미니게임 Scene과 정의는 최초 진입 전까지 별도 청크로 지연 로딩합니다.
- 해안도로는 Ocean에서 바다 탐험과 분리된 두 번째 트랙으로 자리만 마련했으며, 차량·조작·코스는 다음 설계 입력 이후 구현합니다.
- 웰니스·제품 활성화는 명시적인 Mock Provider이며 실제 제품·의료 효능을 뜻하지 않습니다.

## Future Capacitor Migration

위치, 사진 입력, 알림, 햅틱과 PWA 설치 수명주기는 `src/platform`의 웹 어댑터 뒤에 둡니다. 향후 Capacitor 프로젝트에서는 React와 게임 코드를 유지하고 `WebLocationProvider`, `WebCameraProvider`, `WebNotificationProvider` 등을 네이티브 구현으로 교체합니다. 세부 경계는 [INTEGRATION_BOUNDARIES.md](./INTEGRATION_BOUNDARIES.md), 모바일 전환은 [MOBILE_MIGRATION.md](./MOBILE_MIGRATION.md)를 참고합니다.
