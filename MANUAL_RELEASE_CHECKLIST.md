# Diha 수동 출시 체크리스트

코드나 자동 배포만으로 완료할 수 없는 계정·실기기 검증 항목입니다. 공식 주소는 `https://d-ha.vercel.app` 하나만 사용합니다.

## Google Search Console

- [ ] 공식 Production URL 등록
- [ ] Google 소유권 인증 token 발급
- [ ] Vercel Production 환경변수 `VITE_GOOGLE_SITE_VERIFICATION` 등록 후 재배포
- [ ] `https://d-ha.vercel.app/sitemap.xml` 제출
- [ ] 홈페이지 URL 검사
- [ ] 홈페이지 색인 생성 요청

## Naver Search Advisor

- [ ] 공식 Production URL 등록
- [ ] Naver 소유권 인증 token 발급
- [ ] Vercel Production 환경변수 `VITE_NAVER_SITE_VERIFICATION` 등록 후 재배포
- [ ] `https://d-ha.vercel.app/sitemap.xml` 제출
- [ ] 사이트 수집 및 색인 상태 확인

## 실제 기기 PWA

- [ ] Android Chrome에서 `Diha 설치하기` 버튼과 브라우저 설치창 확인
- [ ] 설치된 Android 앱이 standalone 모드로 열리는지 확인
- [ ] iPhone Safari에서 `공유 → 홈 화면에 추가` 안내 확인
- [ ] iPhone 홈 화면 아이콘과 standalone 실행 확인
- [ ] 로그인 완료 사용자는 기존 펫 홈으로, 미완료 사용자는 온보딩으로 진입하는지 확인
- [ ] 네트워크를 잠시 끈 상태에서 앱 셸이 열리는지 확인
- [ ] 새 배포 후 `새 버전이 있어요` 안내와 업데이트 버튼 확인

검색 순위와 색인 시점은 Google과 Naver가 결정하며 1위 또는 즉시 노출을 보장하지 않습니다.
