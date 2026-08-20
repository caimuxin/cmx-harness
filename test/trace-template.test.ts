import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 留痕模板完整性测试。
 * 约束：docs/trace/TRACE_TEMPLATE.md 必须包含 7 个追踪字段
 * （全局约束 7，PRD 15.2 完成标准）。
 */
test('TRACE_TEMPLATE.md 必须包含全部 7 个留痕字段', () => {
  const template = readFileSync(join(process.cwd(), 'docs/trace/TRACE_TEMPLATE.md'), 'utf8');
  for (const field of ['Source', 'Plan Task', 'Requirement', 'Review', 'Tests', 'Acceptance', 'Retro']) {
    assert.ok(template.includes(field), `模板缺少字段: ${field}`);
  }
});
