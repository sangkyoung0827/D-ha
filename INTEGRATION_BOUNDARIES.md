# 향후 알고케어 통합 경계

현재 버전은 네트워크 계정이나 실제 웰니스·제품 데이터를 연결하지 않습니다. UI가 실제 연동처럼 보이지 않도록 모든 기본 구현은 `Mock` 또는 `Local demo`로 명시합니다.

## 제공자 계약

- `WellnessProvider`: 일일 컨디션과 최근 활동을 읽는 미래 경계. 현재는 의료 데이터가 아닌 빈 Mock 결과입니다.
- `ProductActivationProvider`: 제품 코드 활성화 결과 경계. 현재는 `not-connected`만 반환합니다.
- `NotificationProvider`: 권한 요청, 예약, 취소 경계. 웹은 사용자가 버튼을 누른 뒤 Browser Notification만 사용합니다.
- `SocialProvider`: 친구 목록과 방문 세계 경계. 현재 3명의 고정 데모 친구만 반환합니다.

도메인 로직은 제공자 구현을 import하지 않습니다. React의 기능 컨트롤러가 제공자를 호출하고 검증된 결과만 store action에 전달합니다.

## 확장 대상

| 대상 | 교체 지점 | 필수 안전 조건 |
|---|---|---|
| DHA 제품 QR·serving | ProductActivationProvider | 서명된 코드, 중복 활성화, 실제 구매와 게임 보상 분리 |
| 섭취 루틴 | WellnessProvider 파생 DTO | 동의, 최소 수집, 게임 문구와 의료 판단 분리 |
| 알고케어·웰니스 데이터 | WellnessProvider | 인증·철회·보존 기간·출처 표시 |
| 모바일 로컬 알림 | NotificationProvider | OS 권한, 시간대, 해제와 조용한 시간 |
| 계정 동기화 | 새 SyncProvider | 로컬 우선 충돌 해결, 암호화, 탈퇴·내보내기 |
| 실제 친구 | SocialProvider | 차단·신고·공개 범위·미성년자 안전 |
| 생태계 탐험 | 별도 WorldProvider | 게임 진행과 실제 건강 데이터 비결합 |

Provider 응답은 Zod DTO로 검증하고, 사용자 화면에는 출처·동기화 시각·Mock 여부를 명확히 표시합니다. 서버 연결 실패가 로컬 돌봄 루프나 저장을 막아서는 안 됩니다.
