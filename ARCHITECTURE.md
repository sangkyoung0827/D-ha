# Architecture

## React와 Phaser의 역할

React는 온보딩, 상태 바, 방 메뉴, 상점, 옷장, 업적, 설정, 접근성 컨트롤과 PWA 업데이트 UI를 담당합니다. Phaser는 전신 Keeper, 8개 방 배경, 터치·드래그 반응, 파티클과 세 미니게임의 프레임 루프만 담당합니다. Phaser Scene이 경제나 저장소를 직접 수정하지 않습니다.

`GameBridge`는 이벤트 이름과 payload가 타입으로 고정된 유일한 경계입니다. React는 스타일·방·설정·행동을 내보내고 Phaser는 목욕 진행률과 미니게임 결과를 돌려줍니다. 전역 변수나 DOM 커스텀 이벤트는 사용하지 않습니다.

## 상태 관리와 저장

Zustand의 `GameStore`는 version 3 `GameSave`와 화면 런타임 상태를 결합합니다. 모든 변경은 `commit`을 통해 일일 목표, 레벨, 업적, 알림을 한 번에 마감한 뒤 저장됩니다. 상태 감소·컨디션·가격·보상·레벨은 `src/domain`의 순수 함수입니다.

저장 정본은 IndexedDB이며 즉시 새로고침 경합을 막기 위한 동기 localStorage 미러가 있습니다. 로드 시 둘 다 Zod로 검증하고 더 최근의 `lastSavedAt`을 선택합니다. v1/v2는 v3로 마이그레이션하며, 손상 입력은 안전한 기본 저장과 원문 백업을 반환합니다.

## 게임 이벤트

```text
React action → domain/store commit → GameBridge keeper reaction
Phaser drag → bath progress/complete → React care action → persisted save
Phaser game finish → React reward preview → claim → central reward function → save
```

Scene의 bridge 구독, 키보드 이벤트, 타이머, 파티클은 `shutdown`에서 해제됩니다. 설정 변경은 Scene 재생성 없이 Keeper의 motion/style에 반영됩니다.

## 미니게임 플러그인 구조

각 게임은 `MiniGameDefinition`의 `start/pause/resume/finish/calculateReward` 계약을 따릅니다. `loadDefinition`은 동적 import로 세 정의를 분리하고, `MiniGameScene`도 게임 진입 시점에만 불러옵니다. 점수는 Scene에서 만들지만 코인·XP 상한은 `domain/economy.ts` 한 곳에서 계산합니다.

## 플랫폼 어댑터

- `NotificationProvider`: 명시적 권한 요청과 브라우저 알림
- `SocialProvider`: 현재는 로컬 데모 친구
- `WellnessProvider`: 실제 건강 데이터가 아닌 Mock
- `ProductActivationProvider`: 연결되지 않음을 반환하는 Mock
- audio/voice: Web Audio, 진동, 마이크 리소스 수명 관리

Capacitor 전환 시 도메인과 UI 계약은 유지하고 이 구현만 네이티브 플러그인으로 교체합니다.

## 테스트 구조

Vitest는 시간 감소, clamp, 컨디션, 경제, 레벨, 업적, 일일 초기화, 마이그레이션과 보상 상한을 검증합니다. Playwright는 Production 빌드를 띄워 온보딩부터 돌봄·게임·구매·장착·새로고침·JSON 이동·데모·모바일 오버플로·PWA 오프라인 셸까지 Chromium에서 실행합니다.
