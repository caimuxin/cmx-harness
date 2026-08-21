/**
 * MVP 默认状态机配置（PRD 9.1 / 9.2 / 9.3）
 *
 * I-8 流程即配置：状态机来自配置中心。本文件是 MVP 默认配置，
 * HARN-014 配置中心将把同构配置放入持久化存储；业务代码不硬编码流转。
 *
 * 配置结构与 PRD 9 原文一一对应：主流转 + 异常状态。
 * 异常状态按 PRD 9 通则 3 处理：必须携带原因，只能通过配置流转或管理员豁免进入。
 */

import type { StateMachineConfig } from './state-machine'

/** 需求状态机（PRD 9.1） */
export const requirementStateMachine: StateMachineConfig = {
  草稿: [
    { to: '待澄清', action: '发起需求澄清' },
    { to: '取消', action: '需求取消', strength: 'MUST' },
  ],
  待澄清: [
    { to: '待业务评审', action: '澄清完成，进入业务评审' },
    { to: '需补充', action: '信息不足退回补充' },
    { to: '取消', action: '需求取消', strength: 'MUST' },
  ],
  待业务评审: [
    { to: '待技术评审', action: '业务评审通过' },
    { to: '需补充', action: '业务评审要求补充' },
    { to: '驳回', action: '业务评审驳回' },
    { to: '挂起', action: '业务评审决定挂起' },
  ],
  待技术评审: [
    { to: '待排期', action: '技术评审通过，进入排期' },
    { to: '需补充', action: '技术评审要求补充' },
    { to: '驳回', action: '技术评审驳回' },
    { to: '挂起', action: '技术评审决定挂起' },
  ],
  待排期: [
    { to: '已排期', action: '纳入迭代计划' },
    { to: '阻塞', action: '排期受阻' },
    { to: '取消', action: '需求取消', strength: 'MUST' },
  ],
  已排期: [
    { to: '开发中', action: '开始开发' },
    { to: '阻塞', action: '开发受阻' },
  ],
  开发中: [
    { to: '测试中', action: '开发完成，进入测试' },
    { to: '阻塞', action: '开发受阻' },
  ],
  测试中: [
    { to: '待发布', action: '测试通过，准备发布' },
    { to: '开发中', action: '测试发现问题退回开发' },
    { to: '阻塞', action: '测试受阻' },
  ],
  待发布: [
    { to: '已发布', action: '发布完成' },
    { to: '测试中', action: '发布准备被驳回' },
  ],
  已发布: [
    { to: '待验收', action: '发布完成，进入业务验收' },
  ],
  待验收: [
    { to: '已关闭', action: '验收通过，关闭需求' },
  ],
  // 异常状态出口（必须配置，否则一旦进入将无法流转）
  需补充: [
    { to: '待澄清', action: '补充完成，重新澄清' },
    { to: '取消', action: '需求取消', strength: 'MUST' },
  ],
  阻塞: [
    { to: '已排期', action: '阻塞解除，回到排期' },
    { to: '开发中', action: '阻塞解除，继续开发' },
    { to: '测试中', action: '阻塞解除，继续测试' },
    { to: '取消', action: '需求取消', strength: 'MUST' },
  ],
  挂起: [
    { to: '待业务评审', action: '挂起解除，回到业务评审' },
    { to: '待技术评审', action: '挂起解除，回到技术评审' },
  ],
  // 终态（无出口流转）
  已关闭: [],
  取消: [],
  驳回: [],
}

/** 任务状态机（PRD 9.2） */
export const taskStateMachine: StateMachineConfig = {
  待处理: [
    { to: '进行中', action: '开始处理' },
    { to: '取消', action: '任务取消', strength: 'MUST' },
  ],
  进行中: [
    { to: '待代码评审', action: '提交代码，等待评审' },
    { to: '待构建', action: '进入构建' },
    { to: '待测试', action: '进入测试' },
    { to: '阻塞', action: '任务受阻' },
  ],
  待代码评审: [
    { to: '待构建', action: '评审通过' },
    { to: '退回', action: '评审要求修改' },
  ],
  待构建: [
    { to: '待测试', action: '构建通过' },
    { to: '退回', action: '构建失败退回' },
  ],
  待测试: [
    { to: '已完成', action: '测试通过' },
    { to: '退回', action: '测试失败退回' },
  ],
  已完成: [],
  // 异常状态出口
  阻塞: [
    { to: '进行中', action: '阻塞解除，继续' },
    { to: '取消', action: '任务取消', strength: 'MUST' },
  ],
  退回: [
    { to: '进行中', action: '重新处理' },
    { to: '取消', action: '任务取消', strength: 'MUST' },
  ],
  取消: [],
}

/** 发布单状态机（PRD 9.3） */
export const releaseStateMachine: StateMachineConfig = {
  草稿: [
    { to: '待审批', action: '提交审批' },
    { to: '已取消', action: '取消发布单', strength: 'MUST' },
  ],
  待审批: [
    { to: '待部署', action: '审批通过' },
    { to: '已驳回', action: '审批驳回' },
  ],
  待部署: [
    { to: '部署中', action: '触发部署' },
    { to: '已取消', action: '取消发布单', strength: 'MUST' },
  ],
  部署中: [
    { to: '待验证', action: '部署完成，等待验证' },
    { to: '部署失败', action: '部署失败' },
  ],
  待验证: [
    { to: '已发布', action: '生产验证通过' },
    { to: '已回滚', action: '验证失败回滚' },
    { to: '已驳回', action: '验证不通过驳回' },
  ],
  已发布: [
    { to: '已关闭', action: '发布单关闭' },
    { to: '已回滚', action: '发布后回滚' },
  ],
  已关闭: [],
  // 异常状态出口
  已驳回: [
    { to: '草稿', action: '重新编辑' },
    { to: '已取消', action: '取消发布单', strength: 'MUST' },
  ],
  部署失败: [
    { to: '待部署', action: '修复后重新部署' },
    { to: '已回滚', action: '失败后回滚' },
  ],
  已回滚: [
    { to: '已关闭', action: '回滚完成，关闭发布单' },
  ],
  已取消: [],
}

/** 全部状态机定义（HARN-014 配置中心将覆盖/持久化同构配置） */
export const stateMachines = {
  requirement: requirementStateMachine,
  task: taskStateMachine,
  release: releaseStateMachine,
} as const

export type StateMachineEntity = keyof typeof stateMachines

/** 获取某实体类型的状态机 */
export function getStateMachine(entity: StateMachineEntity) {
  return stateMachines[entity]
}
