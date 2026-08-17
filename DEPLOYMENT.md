# Deployment

## 단일 프로젝트 정책

- Vercel 팀: `waterfallingsound0827-1983s-projects`
- 프로젝트명: `d-ha`
- Git 저장소: `sangkyoung0827/D-ha`
- Production branch: `main`
- Framework: Vite
- Install / Build / Output: `pnpm install` / `pnpm build` / `dist`

기존 `d-ha`가 저장소와 연결되어 있으면 재사용합니다. 없을 때만 한 번 생성합니다. 이름·연결 충돌이 있으면 새 프로젝트를 만들지 않고 배포를 중단합니다.

## Preview 차단

`vercel.json`은 현재 Vercel 공식 스키마의 `git.deploymentEnabled` 객체를 사용합니다. `*`는 `false`, `main`은 `true`이며 Vercel은 여러 규칙 중 하나라도 `true`이면 배포합니다. 따라서 main만 자동 Production 대상이고 다른 브랜치는 공개 Preview를 만들지 않습니다.

## 배포 순서

1. `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`
2. main 커밋과 GitHub push
3. 팀의 기존 프로젝트 존재·Git 연결 확인
4. 같은 `d-ha`에 Production 배포
5. 공식 Production 도메인으로 HTTP 200, 첫 화면, JS/CSS, 캐릭터 생성·저장, 미니게임, 모바일, manifest, service worker, 직접 경로, 콘솔을 검증
6. 검증된 공식 도메인 하나만 README Production 절에 기록

generated deployment URL과 Preview URL은 내부 식별자로만 사용하고 문서에 남기지 않습니다. 배포 실패 시 같은 프로젝트에서 원인을 수정하고 재배포합니다.
