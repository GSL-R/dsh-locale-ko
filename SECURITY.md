# 보안 정책

이 패키지는 DeepSeek Harness 웹 GUI의 UI 문자열을 한국어로 번역하는 **클라이언트 언어 팩**입니다.
런타임에 네트워크를 호출하지 않고, 파일을 읽거나 쓰지 않으며, 설치 시 스크립트를 실행하지 않습니다.

## 검증 방법 (누구나 가능)

```powershell
# 1) 레지스트리 서명 + provenance 검증
npm audit signatures

# 2) 설치 시 실행되는 스크립트가 있는지 (이 패키지는 비어 있어야 정상)
npm view dsh-locale-ko-kr scripts

# 3) 어떤 파일이 오는지
npm pack dsh-locale-ko-kr --dry-run
```

- **Provenance**: 모든 버전은 GitHub Actions(`.github/workflows/release.yml`)에서 SLSA provenance와 함께 게시됩니다.
  npm 패키지 페이지의 provenance 배지에서 저장소·커밋·워크플로를 확인할 수 있습니다.
- **게시 경로 단일화**: npm 패키지 설정에 *Require two-factor authentication and disallow tokens* 를 적용해
  **OIDC(Trusted Publishing) 외의 게시 경로를 차단**했습니다.
- **설치 스크립트 없음**: `package.json`에 `preinstall`/`install`/`postinstall`이 없습니다. 설치해도 코드가 실행되지 않습니다.
- **작은 표면적**: 배포물은 10개 파일이며, 실행 코드는 `index.js`(빈 `apply`)와 `client.js`(사전 + `addLanguage`/`register`)뿐입니다.

## 신뢰 경계

Provenance는 “이 패키지가 어떤 저장소의 어떤 커밋에서 빌드되었는가”를 증명합니다.
코드의 안전성 자체를 보증하지는 않으므로, 저장소의 커밋 내용과 배포물을 함께 확인하는 것을 권장합니다.

- 저장소: https://github.com/GSL-R/dsh-locale-ko
- 번역 원본: `translations/ko/*.json` (사람이 읽을 수 있는 텍스트만 포함)
- 사전 기준선: `schema/namespaces.json` (키 이름·플레이스홀더만 포함, 영문 원문 없음)

## 취약점 신고

보안 문제를 발견하면 공개 이슈 대신 **GitHub Security Advisory**(저장소 → Security → Report a vulnerability)로 알려주세요.
확인 후 48시간 내에 회신하고, 수정이 준비되면 새 버전으로 게시합니다.

## 지원 범위

최신 마이너 버전(`0.1.x`)만 지원합니다. DSH 업데이트로 키가 바뀐 경우 번역 누락은 보안 문제가 아니며,
`npm run drift`로 확인해 새 키를 채우는 것으로 처리합니다.
