# dsh-locale-ko-kr

[![validate](https://github.com/GSL-R/dsh-locale-ko/actions/workflows/ci.yml/badge.svg)](https://github.com/GSL-R/dsh-locale-ko/actions/workflows/ci.yml)
[![watch-dsh](https://github.com/GSL-R/dsh-locale-ko/actions/workflows/watch-dsh.yml/badge.svg)](https://github.com/GSL-R/dsh-locale-ko/actions/workflows/watch-dsh.yml)
[![npm](https://img.shields.io/npm/v/dsh-locale-ko-kr.svg)](https://www.npmjs.com/package/dsh-locale-ko-kr)

**DeepSeek Harness 웹 GUI용 한국어 언어 팩.** DSH는 기본적으로 `English`와 `中文`만 제공합니다.
이 플러그인은 [공식 언어 팩 규격](https://github.com/deepseek-ai)대로 `ko` 로케일을 등록해
인터페이스를 한국어로 바꿉니다.

- npm 패키지: **`dsh-locale-ko-kr`** (저장소 이름은 `dsh-locale-ko`)
- 언어 ID `ko`, 표시 이름 `한국어`, 폴백 `en` (번역이 없는 키는 영어로 표시)
- **63개 네임스페이스 / 2,901개 문자열** — 설정, 채팅, 워크스페이스, 사이드바, 플러그인 관리,
  예약, 터미널, 문서 뷰어, 음성 입력 등 클라이언트 UI 전 범위
- 설치 시 빌드 과정 없음 (`client.js`를 저장소에 커밋)

> 비공식 커뮤니티 언어 팩입니다. DeepSeek의 공식 배포물이 아닙니다. ([NOTICE](NOTICE))

## 설치

### 1) npm에서 설치

```powershell
dsh plugin --profile desktop add dsh-locale-ko-kr
```

### 2) GitHub 저장소에서 바로 설치

```powershell
dsh plugin --profile desktop add github:GSL-R/dsh-locale-ko
```

### 3) 로컬 디렉터리로 설치

```powershell
git clone https://github.com/GSL-R/dsh-locale-ko.git
dsh plugin --profile desktop add "file:<복제한 폴더의 절대 경로>"
```

### 4) GUI에서 설치

사이드바 **Plugins → Add plugin**에 npm 패키지 이름, GitHub 주소, 또는 로컬 경로를 넣고 **Install**.
설치가 끝나면 새 번들이 기본으로 활성화되고, HMR이 켜진 프로필에서는 재시작 없이 적용됩니다.

## 언어 전환

**Settings → General → Language → `한국어`**.
선택은 프로필 설정(`locale.preference`)에 저장되어 브라우저를 바꿔도 유지됩니다.

## 제거

```powershell
dsh plugin --profile desktop remove dsh-locale-ko-kr
```

또는 Plugins 페이지에서 **Uninstall**. 언어는 사용 가능한 기본값으로 돌아갑니다.

## 저장소 구조

| 경로 | 역할 |
| --- | --- |
| `client.js` | 빌드된 클라이언트 번들 (`addLanguage` + 네임스페이스별 `register`) |
| `index.js` | 호스트 절반 — 비어 있음 |
| `cordis.patch.yml` | 로더 행 삽입 (`id: locale-ko`) |
| `translations/ko/*.json` | 번역 원본. **이 파일들이 유일한 소스** |
| `schema/namespaces.json` | 키 이름 + 플레이스홀더 기준선 (영문 원문 미포함, CI 검증용) |
| `schema/meta.json` | 현재 번역이 기준으로 삼은 DSH 버전 (릴리스 감시용) |
| `scripts/` | 추출·빌드·검증·드리프트·릴리스 감시 스크립트 (의존성 없음) |
| `locale/{en,ko}.json`, `icon.svg` | 플러그인 목록 표시용 메타데이터 |

## DSH 업데이트 후 재번역 (핵심 워크플로)

```powershell
npm run update-check                                                      # 새 DSH 버전 확인 → reports/
npm run extract -- --asar "C:\...\DeepSeek Harness\resources\app.asar"   # 설치본에서 영문 추출 (en/)
npm run drift                                                            # 기준선과 비교 → reports/drift.md
npm run build                                                            # translations/ko + en → client.js, schema/
npm run check                                                            # 키/플레이스홀더 오프라인 검증
```

- `drift`는 **새 네임스페이스 / 새 키 / 사라진 키**를 목록으로 보여줍니다. 새 키만 번역하면 됩니다.
- `build`는 번역이 빠진 키를 알려주고, `--strict`에서 실패합니다(`npm run verify`).
- `extract`는 `schema/meta.json`의 `dshVersion`을 자동으로 갱신합니다.
- `asar` 경로를 생략하면 Windows/macOS 기본 설치 경로를 자동 탐색합니다(`DSH_ASAR` 환경변수도 지원).
- 영문 원문(`en/`)은 라이선스·드리프트 이유로 **커밋하지 않습니다**(`.gitignore`).

자세한 절차와 용어집: [docs/MAINTENANCE.md](docs/MAINTENANCE.md), [docs/GLOSSARY.md](docs/GLOSSARY.md).

## 업데이트 감시 (자동)

`.github/workflows/watch-dsh.yml`이 매일 07:00(KST)에 두 곳을 확인합니다.

- 데스크톱 업데이트 피드(`download.deepseek.com`, 실제 배포 채널)
- npm `@deepseek-ai/dsh`의 dist-tags

기준선(`schema/meta.json`)과 버전이 다르면 **`dsh-update` 라벨로 이슈를 자동 생성**하고,
이슈 본문에 재번역 절차가 함께 들어갑니다. 이미 열린 이슈가 있으면 중복 생성하지 않습니다.
수동 실행은 `Actions → watch-dsh → Run workflow`.

## 보안

- 모든 버전이 **SLSA provenance**와 함께 GitHub Actions에서 게시됩니다(저장소·커밋·워크플로가 서명으로 남음).
- npm 패키지 설정에서 **2FA 필수 + 토큰 게시 차단**을 적용해, 게시 경로를 **OIDC 하나로** 제한했습니다.
- **설치 스크립트가 없습니다**(`preinstall`/`install`/`postinstall` 없음). 설치해도 코드가 실행되지 않습니다.
- 검증 명령과 신고 절차는 [SECURITY.md](SECURITY.md)에 정리했습니다.

```powershell
npm audit signatures
npm view dsh-locale-ko-kr scripts   # 비어 있어야 정상
```

## English

`dsh-locale-ko-kr` is a community Korean language pack for the DeepSeek Harness web GUI.
Install it with `dsh plugin --profile desktop add dsh-locale-ko-kr` (or
`github:GSL-R/dsh-locale-ko`), then pick **한국어** under Settings → General → Language.
It registers the `ko` locale through the documented client locale service and falls back to
English for any key it does not cover. Translations live in `translations/ko/`;
`npm run update-check` and `npm run drift` report what a new DSH release changed.

## 라이선스

MIT. 영문 원문은 DSH(MIT, © 2026 DeepSeek)에서 오며, 자세한 내용은 [NOTICE](NOTICE)를 참고하세요.
