# 유지보수 절차

DSH가 업데이트되면 UI 문자열이 추가·변경·삭제됩니다. 이 저장소는 그 차이만 골라내서
**바뀐 것만 번역**하는 것을 목표로 합니다.

## 1. 현재 기준선 확인

```powershell
node -e "console.log(require('./en/_meta.json'))"   # 마지막으로 추출한 DSH 버전
```

`schema/namespaces.json`이 커밋된 기준선입니다. 키 이름과 플레이스홀더만 담고 있습니다.

## 2. 새 버전에서 영문 추출

```powershell
npm run extract -- --asar "C:\Users\<user>\AppData\Local\Programs\DeepSeek Harness\resources\app.asar"
```

`en/<namespace>.json`이 새로 만들어집니다(추적 안 함). 앱이 업데이트되지 않았다면 필요 없습니다.

## 3. 드리프트 확인

```powershell
npm run drift
```

`reports/drift.md`에 다음이 정리됩니다.

- 새 네임스페이스 / 사라진 네임스페이스
- 새 키 / 사라진 키 (네임스페이스/키 형식)

새 키만 `translations/ko/<namespace>.json`에 추가하면 됩니다.

## 4. 번역 추가

- 키는 그대로 두고 값만 한국어로 씁니다.
- `{name}`, `{count}` 같은 플레이스홀더는 **철자까지 그대로** 유지합니다. 개수와 이름이 모두 일치해야 합니다.
- 용어는 [GLOSSARY.md](GLOSSARY.md)를 따릅니다.
- 버튼·메뉴는 명사형("삭제"), 설명·상태는 합니다체("삭제했습니다")를 씁니다.

## 5. 빌드와 검증

```powershell
npm run build     # client.js + schema/namespaces.json 재생성, 누락 키 보고
npm run check     # 오프라인 검증 (CI와 동일)
npm run verify    # build --strict + check
```

## 6. 커밋과 배포

1. `package.json`의 `version`을 올립니다(예: `0.1.0` → `0.2.0`).
2. `CHANGELOG.md`에 대상 DSH 버전과 커버리지를 적습니다.
3. `client.js`, `schema/`, `translations/`를 함께 커밋합니다.
4. 프로필에 설치된 사본은 자동 갱신되지 않으므로 다시 설치합니다.

```powershell
dsh plugin --profile desktop remove dsh-locale-ko-kr
dsh plugin --profile desktop add "file:<저장소 절대 경로>"
```

## 릴리스 (OIDC)

`v*` 태그를 푸시하면 [release.yml](../.github/workflows/release.yml)이 npm에 게시합니다.
토큰·OTP 없이 **Trusted Publishing(OIDC)** 으로 동작하므로, 아래를 **한 번만** 설정하면 됩니다.

1. https://www.npmjs.com/package/dsh-locale-ko-kr/access → **Trusted Publisher**
2. **GitHub Actions** 선택 후 입력:

   | 항목 | 값 |
   | --- | --- |
   | Organization or user | `GSL-R` |
   | Repository | `dsh-locale-ko` |
   | Workflow filename | `release.yml` |
   | Environment | (비움) |

3. 이후 릴리스:

```bash
git tag v0.1.1 && git push origin v0.1.1
```

참고: npm은 **패키지의 첫 버전만** OIDC로 게시할 수 없다([npm/cli#8544](https://github.com/npm/cli/issues/8544)).
`dsh-locale-ko-kr`는 0.1.0을 토큰으로 게시했으므로 이후 버전부터 OIDC가 동작합니다.
또한 첫 게시 때 npm이 만든 `0.0.0-stage` 자리표시자 버전은 지울 수 없으니 그대로 둡니다.

## 문제가 생기면

- 플러그인이 로드되지 않으면 Plugins 페이지에서 행의 오류 메시지를 확인합니다.
- `client.js` 문법은 `node --check client.js`로 확인합니다.
- 번역이 일부 영어로 보이면 그 네임스페이스가 사전에 없거나 키가 바뀐 것입니다. `npm run drift`로 확인합니다.
