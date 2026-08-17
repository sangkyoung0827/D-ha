# Mobile Migration

## Capacitor 도입 단계

1. 웹의 전체 테스트와 PWA 저장 내보내기를 안정화합니다.
2. Capacitor core/CLI를 별도 변경으로 추가하고 `webDir`을 `dist`로 지정합니다.
3. `src/platform` 제공자별 웹 구현과 네이티브 구현을 등록하는 단일 환경 조립점을 만듭니다.
4. 브라우저 빌드를 유지한 채 실제 Android/iOS 기기에서 권한·safe area·백그라운드 복귀를 검증합니다.
5. 네이티브 저장 마이그레이션이 검증된 뒤에만 스토어 빌드를 만듭니다.

현재 웹 저장소에는 Capacitor 패키지나 네이티브 프로젝트를 넣지 않습니다.

## Android와 iOS 프로젝트 생성

웹 테스트가 통과한 커밋에서 `@capacitor/android`, `@capacitor/ios`를 추가하고 `cap add android`, `cap add ios`를 각각 실행합니다. 앱 ID, 서명 팀, 최소 OS, 세로 방향을 한 번 결정해 문서화하고 `pnpm build` 후 `cap sync`를 CI 단계로 고정합니다.

## PWA 저장 데이터 이동

웹 v3 저장을 JSON으로 내보내고 Zod 검증 후 네이티브 Preferences/SQLite에 원자적으로 기록합니다. 최초 실행 시 WebView의 IndexedDB와 localStorage 미러를 읽어 `lastSavedAt`이 최신인 데이터를 선택하고, 성공 확인 전 원본을 삭제하지 않습니다. 향후 스키마도 `version`별 순차 migration을 유지합니다.

## 플랫폼 교체

- 알림: NotificationProvider를 Capacitor Local Notifications로 교체하고 조용한 시간·시간대·취소 ID를 보존합니다.
- 마이크: 명시적 OS 권한 설명, 거절 복구, 3초 메모리 전용 녹음, 백그라운드 즉시 중지를 유지합니다.
- 진동·오디오: Haptics와 네이티브 오디오를 어댑터 내부에서만 사용합니다.
- 아이콘·스플래시: 현재 오리지널 심볼을 Android adaptive icon과 iOS asset catalog 규격으로 다시 출력합니다.

## 앱스토어 전 체크리스트

- Android/iOS 실기기에서 신규·업데이트 설치와 v3 저장 이동
- 오프라인 시작, 날짜·시간대 변경, 24시간 상한, 앱 종료 중 저장
- 마이크·알림 권한의 허용·거절·설정 복귀
- safe area, 390×844 및 소형 화면, 키보드·스크린리더
- 개인정보 처리방침, 데이터 삭제·내보내기, 의료 서비스 아님 표시
- 아이콘·스플래시·버전·서명·스토어 메타데이터
- crash/log에 저장 JSON·음성·식별자가 남지 않는지 확인
