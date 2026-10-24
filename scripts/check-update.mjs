// Compare the installed-target DSH version with the live release feed and npm.
// Usage: node scripts/check-update.mjs [--strict]
// Writes reports/update.json (machine) and reports/update.md (issue body).
import fs from 'node:fs';
import path from 'node:path';

const strict = process.argv.includes('--strict');
const baseline = JSON.parse(fs.readFileSync('schema/meta.json', 'utf8'));
const feedUrl = baseline.feed ?? 'https://download.deepseek.com/dsh-desk/feeds/win-x64/nightly.yml';
const npmPackage = baseline.npmPackage ?? '@deepseek-ai/dsh';

/** Fetch text, returning null instead of throwing. */
async function getText(url, accept = 'text/plain') {
  try {
    const res = await fetch(url, { headers: { accept, 'user-agent': 'dsh-locale-ko update check' } });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { text: await res.text() };
  } catch (error) {
    return { error: String(error?.message ?? error) };
  }
}

const errors = [];
const feed = await getText(feedUrl);
const feedVersion = feed.text ? /^version:\s*['"]?([^'"\r\n]+)['"]?\s*$/m.exec(feed.text)?.[1]?.trim() : undefined;
if (!feedVersion) errors.push(`feed: ${feed.error ?? 'no version field'}`);

const registry = await getText(`https://registry.npmjs.org/${npmPackage.replace('/', '%2F')}`, 'application/json');
let npmTags = {};
if (registry.text) {
  try {
    npmTags = JSON.parse(registry.text)['dist-tags'] ?? {};
  } catch {
    errors.push('registry: unreadable JSON');
  }
} else {
  errors.push(`registry: ${registry.error}`);
}

const baselineVersion = baseline.dshVersion;
const hasUpdate = Boolean(feedVersion && feedVersion !== baselineVersion);
const status = { baseline: baselineVersion, feedVersion: feedVersion ?? null, npmTags, hasUpdate, checkedAt: new Date().toISOString(), feed: feedUrl, errors };

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/update.json', `${JSON.stringify(status, null, 2)}\n`);

const tagLines = Object.entries(npmTags).map(([tag, version]) => `- \`${tag}\`: ${version}`).join('\n') || '- (없음)';
const body = `## ${hasUpdate ? '새 DSH 버전이 나왔습니다' : 'DSH 버전 변경 없음'}

| 항목 | 값 |
| --- | --- |
| 기준선 (schema/meta.json) | \`${baselineVersion}\` |
| 데스크톱 피드 | \`${feedVersion ?? '확인 실패'}\` |
| npm dist-tags | ${Object.entries(npmTags).map(([t, v]) => `\`${t}\`=${v}`).join(', ') || '확인 실패'} |

${hasUpdate ? `### 다음 작업

\`\`\`powershell
npm run extract -- --asar "<DeepSeek Harness>\\resources\\app.asar"   # 또는 npm 패키지 버전으로 교체 후 추출
npm run drift            # 새 키 / 사라진 키 확인
# translations/ko/*.json 에 새 키 번역 추가
npm run build && npm run check
\`\`\`

번역을 마치면 \`schema/meta.json\`의 \`dshVersion\`이 새 버전으로 갱신됩니다(extract가 기록).
` : '기준선과 피드 버전이 같습니다.'}

<sub>자동 생성: \`scripts/check-update.mjs\` · ${status.checkedAt}</sub>
`;
fs.writeFileSync('reports/update.md', body);

console.log(`${hasUpdate ? 'UPDATE' : 'OK'} — baseline ${baselineVersion}, feed ${feedVersion ?? 'unknown'}, npm latest ${npmTags.latest ?? 'unknown'}${errors.length ? ` (${errors.join('; ')})` : ''}`);
if (strict && hasUpdate) process.exit(1);
