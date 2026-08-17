# Diha Human Keeper

사람 형태의 `Ocean Keeper`와 일상을 돌보는 모바일 우선 로컬 게임입니다. 다섯 상태를 살피고, 8개 공간을 오가며, 세 미니게임으로 코인과 경험치를 얻습니다. 의료 서비스나 실제 웰니스 연동처럼 보이지 않도록 게임 시스템과 미래 통합 경계를 분리했습니다.

## 현재 구현 범위

- 이름·피부 톤·머리 모양·머리 색상을 고르는 온보딩과 튜토리얼
- 포만감·청결·에너지·즐거움·컨디션의 시간 경과 및 최대 24시간 오프라인 계산
- 스튜디오, 주방, 욕실, 침실, 웰니스 랩, 게임룸, 옷장, 상점
- Bubble Focus, Current Run, Reef Memory 실제 플레이 및 지연 로딩
- 코인, XP, 레벨, 해금, 39개 아이템, 의상 장착, 4개 방 테마
- 12개 업적, 일일 목표, 연속 방문, 로컬 데모 친구
- IndexedDB 저장, 동기 localStorage 미러, Zod 검증, v1/v2 마이그레이션, JSON 내보내기·가져오기
- PWA 앱 셸, 오프라인 재실행, 업데이트 배너, 설치 가능한 manifest
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

- 화면 아래 방 메뉴로 공간을 이동합니다.
- 주방에서 보유 음식을 선택하고, 욕실 Canvas에서 Keeper를 드래그하거나 빠른 씻기 버튼을 사용합니다.
- 침실은 수면, 웰니스 랩은 게임 아이템, 옷장과 상점은 스타일·테마 관리를 담당합니다.
- 게임룸에서 세 게임을 선택합니다. Current Run은 좌우 화살표·스와이프·화면 외부 버튼을 모두 지원합니다.
- Keeper를 터치하면 표정, 대사, 작은 모션으로 반응합니다.

## 주요 폴더 구조

```text
src/app              React 앱 조립
src/components       온보딩·게임 UI·설정
src/domain           상태·경제·성장·업적·아이템 순수 로직
src/game             Phaser 엔티티·Scene·명시적 bridge
src/minigames        지연 로딩 미니게임 정의
src/platform         알림·소셜·웰니스·제품·오디오 어댑터
src/store            Zustand, IndexedDB, 검증·마이그레이션
src/test             Vitest 단위 테스트
e2e                  Playwright 사용자 흐름
```

## 저장 방식

정본은 `diha-keeper` IndexedDB의 `game-save/primary` 레코드입니다. 행동 직후 새로고침에도 안전하도록 같은 v3 데이터를 localStorage에 동기 미러하고, 로드할 때 `lastSavedAt`이 더 최신인 유효 데이터를 선택합니다. 모든 가져오기와 이전 버전 저장은 Zod 스키마를 통과해야 하며, 손상 데이터는 초기화 전 다운로드 가능한 백업으로 남깁니다. 서버 계정 동기화는 현재 구현하지 않았습니다.

## PWA 설치

Production 또는 로컬 HTTPS 환경에서 브라우저의 “앱 설치” 메뉴를 사용합니다. 앱 셸과 정적 리소스가 미리 캐시되며, 새 서비스 워커가 준비되면 앱 안에서 업데이트 버튼을 표시합니다. 알림·마이크 권한은 해당 기능의 명시적 버튼을 누를 때만 요청합니다.

## 데모 모드

`/?debug=1`에서 오른쪽 `DEV` 탭을 엽니다. 상태 조절, 1시간·1일·3일 경과, 오프라인 복귀, 코인·레벨, 전체 아이템, 업적 초기화, 인앱 알림, 애니메이션, 저장 시각을 실제 도메인 경로로 시험할 수 있습니다.

## Production

Production 배포 검증 후 공식 도메인 하나만 이 절에 기록합니다.

## 알려진 제한

- 백엔드, 계정 동기화, 실제 사용자 친구, 서버 Push는 없습니다.
- 음성 에코는 브라우저 `MediaRecorder`와 Web Audio 지원 범위에서만 동작하며 녹음을 저장하지 않습니다.
- Phaser가 초기 게임 화면에 필요해 vendor 청크가 크지만, 세 미니게임 Scene과 정의는 최초 진입 전까지 별도 청크로 지연 로딩합니다.
- 웰니스·제품 활성화는 명시적인 Mock Provider이며 실제 제품·의료 효능을 뜻하지 않습니다.

## 향후 Diha 확장

QR 제품 활성화, serving 수량, 섭취 루틴, 알고케어·웰니스 데이터, 모바일 로컬 알림, 계정 동기화, 실제 친구, 바다 생태계 탐험은 `src/platform` 인터페이스 뒤에서 교체합니다. 세부 경계는 [INTEGRATION_BOUNDARIES.md](./INTEGRATION_BOUNDARIES.md), 모바일 전환은 [MOBILE_MIGRATION.md](./MOBILE_MIGRATION.md)를 참고합니다.
