# DevOps Delivery Harness PRD v1.0

Date: 2026-08-18

## 1. Product Positioning

DevOps Delivery Harness is an integrated delivery platform for a single software team. It owns the business delivery loop of requirements, tasks, tests, releases, acceptance, and metrics, while GitHub owns source control, pull requests, code review, GitHub Actions execution, and deployment signals.

Core positioning:

```text
The platform manages the delivery loop. GitHub executes code collaboration and automation.
```

The product turns this flow into a governed, traceable, and measurable system:

```text
Requirement -> Clarification -> Review -> Planning -> Tasking -> Branch -> Commit -> Pull Request -> CI/Test -> Release -> Deployment -> Verification -> Acceptance -> Retrospective
```

## 2. Target Users

The first version is designed for one product engineering team with product, development, testing, and release responsibilities.

| Role | Primary Needs |
| --- | --- |
| Product owner | Capture requirements, define value and acceptance criteria, track delivery and business acceptance. |
| Developer | Pick up tasks, create branches, submit code, handle PR review and CI failures. |
| Tester | Manage test cases, test plans, defects, regression status, and release quality gates. |
| Team lead | Track iteration progress, delivery risks, blockers, PR status, and release readiness. |
| Release owner | Create release tickets, coordinate approval, trigger deployment, verify release, and record rollback. |
| Business acceptor | Confirm production result and close the requirement. |
| Delivery manager | Review cycle time, throughput, quality, deployment stability, and bottlenecks. |

## 3. Product Goals

1. A requirement can be traced from creation to production acceptance.
2. Each development task can be linked to a GitHub branch, commits, PRs, checks, and deployment results.
3. Delivery gates prevent unreviewed, untested, or unapproved work from moving forward.
4. GitHub Actions results are visible in the platform and drive workflow decisions.
5. Release tickets connect requirements, artifacts, environments, deployment records, verification, and rollback plans.
6. The team can see where work is blocked and measure delivery performance.

## 4. Non-Goals for MVP

The first version does not include:

1. Multi-team portfolio management.
2. Complex release train governance.
3. A self-built Git hosting system.
4. A self-built CI engine.
5. Enterprise budget, procurement, or supplier management.
6. Complex permission matrix for large organizations.
7. Advanced test asset platform across many teams.
8. Cross-system architecture governance.
9. Full AI-generated requirements or full autonomous delivery.

## 5. End-to-End Workflow

### 5.1 Main Flow

```text
Create requirement
-> Clarify requirement
-> Business review
-> Technical review
-> Plan into iteration
-> Break down tasks
-> Create GitHub branch
-> Develop and commit
-> Open pull request
-> Code review
-> GitHub Actions build and test
-> Quality gate
-> Merge pull request
-> Create release ticket
-> Trigger deployment
-> Production verification
-> Business acceptance
-> Retrospective and metrics
-> Close requirement
```

### 5.2 Requirement Traceability Chain

Each requirement detail page must display this traceability chain when related data exists:

```text
Requirement
-> Tasks
-> GitHub Branches
-> Commits
-> Pull Requests
-> Reviews
-> GitHub Actions Runs
-> Check Results
-> Artifacts
-> Release Ticket
-> Deployment
-> Verification
-> Acceptance
-> Retrospective Items
```

## 6. Functional Modules

### 6.1 Team Workspace

The team workspace is the daily home page. It should show:

1. My open requirements.
2. My tasks.
3. PRs waiting for review.
4. Failed or blocked GitHub Actions runs.
5. Release tickets waiting for approval or verification.
6. Requirements waiting for acceptance.
7. Current iteration health.
8. Delivery blockers and overdue items.

### 6.2 Requirement Center

The requirement center manages the product and business intake loop.

Required capabilities:

1. Create, edit, archive, and close requirements.
2. Classify requirement type: business, product, technical, defect, compliance, operations.
3. Record source, owner, priority, business value, expected benefit, due date, and acceptance criteria.
4. Link child tasks, test cases, defects, PRs, release tickets, and acceptance records.
5. Move requirements through the configured state machine.
6. Show stage duration and blockers.

Required fields:

| Field | Description |
| --- | --- |
| ID | Stable unique requirement key, such as REQ-001. |
| Title | Short human-readable title. |
| Type | Business, product, technical, defect, compliance, operations. |
| Source | Business, product, customer, incident, regulator, engineering. |
| Owner | Product or requirement owner. |
| Priority | P0, P1, P2, P3. |
| Business value | Why the team should do this. |
| Acceptance criteria | Conditions for acceptance. |
| Target date | Expected date, not delivery commitment. |
| Status | Current requirement status. |
| Linked iteration | Planned iteration, if any. |
| Linked release | Release ticket, if any. |

### 6.3 Review Center

The review center supports business and technical review before development starts.

Business review checks:

1. Business value is clear.
2. User or business scenario is clear.
3. Scope is clear.
4. Out-of-scope items are explicit.
5. Acceptance criteria are testable.

Technical review checks:

1. Technical feasibility is confirmed.
2. Architecture impact is understood.
3. Dependencies are identified.
4. Risks are recorded.
5. Rough effort estimate is provided.
6. Test and release implications are understood.

Review results:

```text
Approved
Rejected
Needs supplement
Deferred
```

### 6.4 Iteration and Planning

Planning connects approved requirements to delivery capacity.

Required capabilities:

1. Create iterations with start date, end date, goal, and capacity.
2. Add approved requirements to an iteration.
3. Break requirements into tasks.
4. Assign owners and due dates.
5. Show planned work, completed work, blocked work, and spillover.
6. Detect unreviewed requirements being added to an iteration.

### 6.5 Task Center

Tasks are executable units of engineering work.

Required capabilities:

1. Create development, testing, documentation, deployment, or investigation tasks under a requirement.
2. Assign owner, estimate, due date, and status.
3. Create a GitHub branch from a task.
4. Link commits and PRs back to the task.
5. Move task status based on GitHub events and manual actions.

Task statuses:

```text
Todo -> In Progress -> Waiting for Code Review -> Waiting for Build -> Waiting for Test -> Done
```

Exception statuses:

```text
Blocked
Returned
Cancelled
```

### 6.6 GitHub Integration

The GitHub integration connects delivery objects with code collaboration and automation.

Required capabilities:

1. Install and configure a GitHub App. OAuth can be added later for user-level convenience, but the MVP integration authority should be a GitHub App.
2. Bind a project to one GitHub repository for MVP.
3. Create a branch from a task.
4. Enforce branch naming convention:

```text
<type>/<requirement-id>-<task-id>-short-title
```

Example:

```text
feature/REQ-001-TASK-003-login-rate-limit
```

5. Sync commits that reference requirement or task IDs.
6. Sync pull request title, status, reviewers, review state, labels, checks, and merge state.
7. Sync GitHub Actions workflow runs and check results.
8. Sync deployment status when GitHub Deployments are used.
9. Store raw external IDs for reconciliation.

### 6.7 Pipeline Center

The pipeline center shows GitHub Actions runs and quality gate status.

Required capabilities:

1. Display latest workflow runs for a branch or PR.
2. Show run status: queued, in progress, success, failure, cancelled.
3. Show failed job and step summary when available.
4. Link run results to PRs, tasks, requirements, and release tickets.
5. Support retry action when GitHub permissions allow it.
6. Feed build and test results into gates.

### 6.8 Test Center

Testing is part of the delivery loop, not a disconnected final phase.

Required capabilities:

1. Create test cases linked to requirements.
2. Create test plans for an iteration or release.
3. Record manual test execution results.
4. Import or sync automated test results from GitHub Actions.
5. Create defects linked to requirements, tasks, test cases, and PRs.
6. Mark defects as blocking or non-blocking.
7. Prevent release readiness when blocking defects are open.

Test result states:

```text
Not Run
Passed
Failed
Blocked
Skipped
```

Defect states:

```text
Open -> In Progress -> Fixed -> Verified -> Closed
```

### 6.9 Release Center

The release center manages controlled production change.

Required capabilities:

1. Create release tickets.
2. Select requirements included in the release.
3. Link PRs, artifacts, deployment runs, test plans, and defects.
4. Record release environment, release window, approvers, and rollback plan.
5. Run pre-release gate checks.
6. Trigger GitHub Actions deployment workflow when configured.
7. Sync deployment status.
8. Record release verification.
9. Record rollback if needed.

Release ticket statuses:

```text
Draft -> Waiting for Approval -> Waiting for Deployment -> Deploying -> Waiting for Verification -> Released -> Closed
```

Exception statuses:

```text
Rejected
Deployment Failed
Rolled Back
Cancelled
```

### 6.10 Acceptance and Retrospective

Acceptance closes the business loop after production verification.

Required capabilities:

1. Record production verification result.
2. Record business acceptance result against acceptance criteria.
3. Capture unfinished or failed acceptance items.
4. Convert failed acceptance items into defects or new requirements.
5. Record retrospective items with owner and follow-up date.

Acceptance results:

```text
Accepted
Rejected
Partially Accepted
Needs Follow-Up
```

### 6.11 Metrics Center

The metrics center helps the team inspect flow, quality, and stability.

MVP metrics:

| Category | Metrics |
| --- | --- |
| Flow | Requirement cycle time, stage duration, waiting time. |
| Development | Task cycle time, PR open-to-merge time, review waiting time. |
| Build | Build success rate, failed runs, mean time to fix build. |
| Test | Test pass rate, blocking defects, reopened defects. |
| Release | Deployment frequency, release success rate, rollback rate. |
| Delivery | Requirement throughput, on-time rate, acceptance pass rate. |

### 6.12 Configuration Center

The configuration center controls workflow rules and integrations.

Required capabilities:

1. Configure requirement states and allowed transitions.
2. Configure gate rules.
3. Configure GitHub repository binding.
4. Configure default branch naming.
5. Configure GitHub Actions workflows used for build, test, and deploy.
6. Configure team roles.

## 7. State Machines

### 7.1 Requirement State Machine

```text
Draft
-> Waiting for Clarification
-> Waiting for Business Review
-> Waiting for Technical Review
-> Waiting for Planning
-> Planned
-> In Development
-> In Testing
-> Waiting for Release
-> Released
-> Waiting for Acceptance
-> Closed
```

Exception states:

```text
Needs Supplement
Blocked
Suspended
Cancelled
Rejected
```

### 7.2 Task State Machine

```text
Todo
-> In Progress
-> Waiting for Code Review
-> Waiting for Build
-> Waiting for Test
-> Done
```

Exception states:

```text
Blocked
Returned
Cancelled
```

### 7.3 Release State Machine

```text
Draft
-> Waiting for Approval
-> Waiting for Deployment
-> Deploying
-> Waiting for Verification
-> Released
-> Closed
```

Exception states:

```text
Rejected
Deployment Failed
Rolled Back
Cancelled
```

## 8. Gate Rules

### 8.1 Requirement Development Gate

A requirement can enter development only when:

1. Business value is filled.
2. Acceptance criteria are filled.
3. Business review is approved.
4. Technical review is approved.
5. Requirement is planned into an iteration.

### 8.2 Pull Request Merge Gate

A PR can be marked ready to merge only when:

1. PR is linked to a requirement and task.
2. At least one reviewer has approved it.
3. Required GitHub Actions checks have succeeded.
4. Automated tests have passed.
5. No blocking defect is linked to the task or requirement.

The platform may show gate status but GitHub branch protection remains the source of truth for actual merge blocking in MVP.

### 8.3 Release Gate

A release ticket can be deployed only when:

1. Release approval is complete.
2. All included requirements have passed testing.
3. Blocking defects count is zero.
4. Artifact or commit SHA is selected.
5. Deployment environment is selected.
6. Rollback plan is filled.

### 8.4 Requirement Closure Gate

A requirement can be closed only when:

1. Production verification has passed.
2. Business acceptance has passed or an explicit exception is recorded.
3. Release result is recorded.
4. Metrics are available for the requirement.

## 9. GitHub Event Mapping

The platform should handle these GitHub events in MVP:

| GitHub Event | Platform Reaction |
| --- | --- |
| push | Link commits to branch, task, and requirement when IDs match. |
| pull_request.opened | Create or update PR link under task and requirement. |
| pull_request.synchronize | Refresh commits and check state. |
| pull_request.closed | Mark PR merged or closed. Update task if appropriate. |
| pull_request_review.submitted | Update review gate. |
| check_run.completed | Update CI/check result. |
| workflow_run.completed | Update workflow result and pipeline view. |
| deployment_status | Update deployment record and release ticket. |
| release.published | Optionally link GitHub Release to release ticket. |

ID matching rules:

1. Requirement IDs and task IDs in branch names must be parsed.
2. Requirement IDs and task IDs in PR titles must be parsed.
3. Requirement IDs and task IDs in commit messages should be parsed as fallback.
4. Manual linking must be available when automatic matching fails.

## 10. Permissions

MVP roles:

| Role | Permissions |
| --- | --- |
| Admin | Configure project, GitHub integration, gates, roles. |
| Product owner | Manage requirements, reviews, acceptance. |
| Developer | Manage own tasks, create branches, link PRs, view gates. |
| Tester | Manage test cases, test plans, defects, test results. |
| Release owner | Manage release tickets, approvals, deployment, rollback records. |
| Viewer | Read-only access. |

## 11. MVP Pages

1. Team workspace.
2. Requirement list.
3. Requirement detail.
4. Review detail.
5. Iteration board.
6. Task detail.
7. GitHub integration settings.
8. PR and pipeline status view.
9. Test plan and defect view.
10. Release ticket detail.
11. Acceptance detail.
12. Metrics dashboard.
13. Gate rule settings.

## 12. Key User Stories

### 12.1 Requirement Owner

As a product owner, I want to create a requirement with value and acceptance criteria so that the team can review and plan it.

As a product owner, I want to see every task, PR, build, test, release, and acceptance record linked to my requirement so that I know whether it is truly done.

### 12.2 Developer

As a developer, I want to create a GitHub branch directly from a task so that my code is traceable to the requirement.

As a developer, I want to see PR review and GitHub Actions failures in the platform so that I can fix blocked work quickly.

### 12.3 Tester

As a tester, I want to link test cases and defects to requirements so that release readiness reflects actual quality.

As a tester, I want automated test results from GitHub Actions to update test status so that I do not have to duplicate status manually.

### 12.4 Release Owner

As a release owner, I want a release ticket to show included requirements, artifacts, test status, approval, deployment, and rollback plan so that production change is controlled.

As a release owner, I want deployment results from GitHub to update the release ticket so that release status is accurate.

### 12.5 Team Lead

As a team lead, I want to see blocked requirements, failed builds, slow PRs, open blocking defects, and releases waiting for verification so that I can remove bottlenecks.

## 13. MVP Acceptance Criteria

The MVP is successful when:

1. A user can create a requirement, review it, plan it, break it into tasks, and close it after acceptance.
2. A user can connect one GitHub repository to the platform.
3. A user can create a GitHub branch from a task.
4. The platform can sync commits, PRs, reviews, and GitHub Actions status.
5. The platform can show PR and CI gate status against a task and requirement.
6. A tester can create test cases, record results, and create blocking defects.
7. A release owner can create a release ticket, include requirements, check gates, trigger or record deployment, verify production, and close the release.
8. A requirement detail page can display the end-to-end traceability chain.
9. A metrics page can show flow, PR, build, test, and release metrics for the team.
10. Gate failures are visible and explain what must be fixed.

## 14. Suggested Implementation Slices

### Slice 1: Requirement and Task Loop

Build requirement center, task center, iteration board, and basic states.

### Slice 2: GitHub Connection

Bind repository, create branches from tasks, sync commits and PRs.

### Slice 3: CI and Gate Visibility

Sync GitHub Actions checks and show gate status.

### Slice 4: Test and Defect Loop

Add test cases, test plans, defects, and blocking quality rules.

### Slice 5: Release and Deployment Loop

Add release tickets, release gates, deployment status, verification, and rollback records.

### Slice 6: Acceptance and Metrics

Add business acceptance, retrospective items, and the MVP metrics dashboard.

## 15. Product Defaults for Implementation Planning

The following defaults are selected for implementation planning:

1. Product shape: deployable web app.
2. Team scope: one team, one project, one GitHub repository for MVP.
3. GitHub integration model: GitHub App.
4. Deployment trigger: GitHub Actions workflow_dispatch when configured.
5. Deployment status source: GitHub deployment_status events when available, otherwise workflow run status.
6. CI engine: GitHub Actions only for MVP.
7. Merge enforcement: GitHub branch protection remains the hard enforcement layer; the platform calculates and displays delivery gates.
8. Backend and frontend stack: to be selected in the implementation plan according to the existing workspace or project constraints.
9. Database: to be selected in the implementation plan, with a relational model preferred because the product has strongly linked workflow objects.
