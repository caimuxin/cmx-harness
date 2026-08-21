import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('package.json scripts 必须包含 test / build / start（HARN-001 验收门禁）', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  for (const script of ['test', 'build', 'start', 'dev']) {
    assert.ok(pkg.scripts?.[script], `package.json 缺少 script: ${script}`);
  }
});

test('tsconfig 必须开启 strict 模式（领域层错误前置拦截）', () => {
  const tsconfig = JSON.parse(readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf8'));
  assert.equal(tsconfig.compilerOptions.strict, true);
});
