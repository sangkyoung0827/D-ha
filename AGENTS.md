# AGENTS.md

이 저장소를 수정하는 모든 자동화 에이전트는 아래 규칙을 따른다.

1. 작업 전에 `git status`, 현재 브랜치, remote와 기존 변경을 확인한다. 사용자 작업을 삭제하거나 강제 푸시하지 않는다.
2. 기능 변경에는 해당 도메인 단위 테스트 또는 Playwright 사용자 흐름을 추가·갱신한다.
3. 상태 감소, 경제, 레벨, 보상, 업적 같은 규칙은 `src/domain`에 한 번만 정의한다. React와 Phaser에 계산식을 복제하지 않는다.
4. 다른 게임·브랜드의 캐릭터, UI, 음원, 이미지, 문구를 복제하지 않는다. 새 에셋은 독창적 코드 그래픽 또는 권리가 확인된 자료만 사용한다.
5. 의료 진단·치료·효능으로 오해될 표현을 쓰지 않는다. 웰니스 아이템은 가상 게임 요소임을 명시한다.
6. 390×844 세로 화면을 기준으로 모바일 우선, 터치 우선, safe-area 지원을 유지한다.
7. React는 앱 셸·접근성·영속 상태, Phaser는 실시간 장면과 입력만 담당한다. 두 영역은 typed `GameBridge`로 연결한다.
8. Vercel 프로젝트는 `waterfallingsound0827-1983s-projects/d-ha` 하나만 유지한다. 배포 실패 시 다른 프로젝트를 만들지 않는다.
9. README에는 검증된 Production URL 하나만 기록한다. Preview 또는 generated deployment URL을 문서화하지 않는다.
10. 배포 전 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`를 모두 통과시킨다.
11. 사용하지 않는 코드·Scene 이벤트·타이머·브라우저 리소스를 제거하고 종료 시 해제한다.
12. 새 브라우저 API는 `src/platform` 어댑터 뒤에 두고, 저장 스키마 변경 시 버전과 마이그레이션을 함께 추가한다.
