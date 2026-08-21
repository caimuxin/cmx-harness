// CMX Harness 健康检查 —— 最小 smoke test
// 直接检查 SQLite 数据库文件存在，避免对 dev server 的依赖
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

test('SQLite 数据库文件已创建（dev.db）', () => {
  assert.ok(existsSync(join(process.cwd(), 'prisma', 'dev.db')), 'prisma/dev.db 不存在，请先运行 npm run db:push');
});
