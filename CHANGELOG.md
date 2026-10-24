# 변경 기록

## 0.1.1 — 2026-10-24

- npm 배지 추가, Trusted Publishing(OIDC) 릴리스 절차 문서화
- `release.yml` 추가: `v*` 태그에서 토큰 없이 게시 (이 버전이 첫 OIDC 게시)
- 번역 내용 변경 없음 (0.1.0과 동일한 63개 네임스페이스 / 2,901개 키)

## 0.1.0 — 2026-10-24

첫 배포.

- 대상: DeepSeek Harness **0.2.1-rc.2** (클라이언트 번들 75개에서 추출)
- 범위: **63개 네임스페이스 / 2,901개 키**
- 언어 정의 `ko` (`한국어`), 폴백 `en`
- 검증: 키 집합·플레이스홀더 불일치 0건, 번들 스모크 테스트 통과
- 배포: npm [`dsh-locale-ko-kr@0.1.0`](https://www.npmjs.com/package/dsh-locale-ko-kr), GitHub 저장소

### 참고

- npm은 첫 게시에만 토큰이 필요했다(2FA bypass granular 토큰). 이후 릴리스는 `v*` 태그 + Trusted Publishing(OIDC)로
  토큰 없이 게시한다 — [docs/MAINTENANCE.md](docs/MAINTENANCE.md#릴리스-oidc).
- npm이 스테이징 기능용으로 자동 생성한 `0.0.0-stage` 자리표시자 버전이 남아 있다. `latest`는 `0.1.0`이다.
