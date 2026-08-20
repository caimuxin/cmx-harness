/**
 * 状态机引擎（PRD 9、I-5、I-8）
 *
 * - 状态机来自配置（I-8）：状态枚举与流转表在 `state-machine.ts` 中定义，
 *   业务代码只调用 `transition()`，不写任何 if/switch 硬编码流转。
 * - 每次流转必须留痕（I-5）：记录操作者、时间戳、原因。
 * - 非法流转（不在配置流转表内）直接拒绝。
 * - 异常状态必须携带原因，只能通过配置流转或管理员豁免进入（PRD 9 通则 3）；
 *   管理员豁免由 HARN-014 权限模块接入，本引擎提供 reason 必填校验。
 */

import type { StateMachineConfig, StateTransitionRecord, Transition } from './types'

export type { StateMachineConfig, Transition }

/** 状态机定义：实体类型 -> 状态流转配置 */
export interface StateMachineDefinition {
  name: string
  config: StateMachineConfig
}

/** 流转请求 */
export interface TransitionRequest {
  from: string
  to: string
  actor: string
  reason: string
}

/** 流转结果 */
export interface TransitionResult {
  ok: boolean
  /** 拒绝原因（ok=false 时） */
  error?: string
  /** 成功后的留痕记录 */
  record?: StateTransitionRecord
}

/**
 * 校验一次流转是否合法。
 * 异常状态仅允许在配置中显式声明的流转进入/离开；缺省一律拒绝。
 */
export function canTransition(config: StateMachineConfig, from: string, to: string): boolean {
  const allowed = config[from]
  if (!allowed) return false
  return allowed.some((t) => t.to === to)
}

/** 获取某状态允许的流转列表 */
export function allowedTransitions(config: StateMachineConfig, from: string): Transition[] {
  return config[from] ?? []
}

/**
 * 执行状态流转并生成留痕记录。
 * 违反配置流转表时返回 { ok: false }，不产生任何记录（非法流转被拒绝）。
 */
export function transition(
  def: Pick<StateMachineDefinition, 'config'>,
  req: TransitionRequest,
): TransitionResult {
  if (req.from === req.to) {
    return { ok: false, error: `状态已是 ${req.from}，无需流转` }
  }
  if (!canTransition(def.config, req.from, req.to)) {
    return { ok: false, error: `非法流转：${req.from} -> ${req.to} 不在配置流转表中` }
  }
  if (!req.reason?.trim()) {
    return { ok: false, error: '状态流转必须填写原因（I-5）' }
  }
  return {
    ok: true,
    record: {
      id: crypto.randomUUID(),
      actor: req.actor,
      from: req.from,
      to: req.to,
      reason: req.reason,
      at: new Date(),
    },
  }
}
