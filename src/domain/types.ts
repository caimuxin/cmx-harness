/**
 * 领域层公共类型
 *
 * 依赖方向：domain 层零框架依赖（无 Prisma / Next / React import）。
 * 数据层（Prisma）模型与这里的类型一一对应，由 modules 层负责映射。
 */

/** 领域对象标识：稳定唯一编号（PRD 8.2，例如 REQ-001） */
export type ObjectId = string

/** 状态流转留痕记录（I-5：每次流转必须记录操作者、时间戳、原因） */
export interface StateTransitionRecord {
  /** 记录 ID */
  id: string
  /** 操作者 */
  actor: string
  /** 流转前状态 */
  from: string
  /** 流转后状态 */
  to: string
  /** 原因 */
  reason: string
  /** 时间戳 */
  at: Date
}

/** 状态机流转定义（I-8：状态机来自配置，禁止硬编码在业务代码） */
export interface Transition {
  /** 目标状态 */
  to: string
  /** 流转动作/条件描述 */
  action: string
  /** 强度标签：MUST / DEFAULT / ESCALATE */
  strength?: 'MUST' | 'DEFAULT' | 'ESCALATE'
}

/** 状态机配置：每个状态允许的流转 */
export type StateMachineConfig = Record<string, Transition[]>
