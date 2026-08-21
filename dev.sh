#!/usr/bin/env bash
# cmx-harness 开发服务器一键启动/关闭脚本
#
# 用法:
#   ./dev.sh start [端口]   # 启动 dev server（默认 3000，端口被占用时自动 +1 递增）
#   ./dev.sh stop           # 停止 dev server
#   ./dev.sh status         # 查看运行状态
#
# 依赖: bash >= 4（macOS 自带 3.2，故不用关联数组）

set -u
cd "$(dirname "$0")" || exit 1

PID_FILE=".dev-server.pid"
PORT_FILE=".dev-server.port"
DEFAULT_PORT=3000
MAX_PORT_ATTEMPTS=10

log() { printf '%s\n' "$*"; }

read_port() {
  cat "$PORT_FILE" 2>/dev/null || printf '%s' "$DEFAULT_PORT"
}

pid_of() {
  # 返回 PID 文件中记录的进程是否存活（0=存活）
  local pid
  pid=$(cat "$PID_FILE" 2>/dev/null) || return 1
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

# 检查端口是否被占用
port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

start() {
  if pid_of; then
    local cur_port
    cur_port=$(read_port)
    log "已在本端口启动过：进程 $(cat "$PID_FILE")，无需重复启动"
    log "状态：$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${cur_port}/api/health" 2>/dev/null || echo '未响应')"
    return 0
  fi
  rm -f "$PID_FILE"

  # 端口被占用则向上递增寻找空闲端口
  local port="$DEFAULT_PORT" attempt=0
  while port_in_use "$port" && [ "$attempt" -lt "$MAX_PORT_ATTEMPTS" ]; do
    attempt=$((attempt + 1))
    port=$((DEFAULT_PORT + attempt))
  done
  if port_in_use "$port"; then
    log "错误：${DEFAULT_PORT}-${port} 端口均被占用，请先释放或改用 ./dev.sh start <端口>" >&2
    exit 1
  fi

  log "启动 dev server：http://localhost:$port  （日志：.dev-server.log）"
  # nohup 脱离终端；日志落盘；PID/端口记录以便 stop 与 status
  nohup npx next dev -p "$port" > .dev-server.log 2>&1 &
  echo $! > "$PID_FILE"
  echo "$port" > "$PORT_FILE"

  # 等待健康检查就绪（最多 60 秒，dev server 冷启动较慢）
  local i
  for i in $(seq 1 60); do
    if curl -s -o /dev/null "http://localhost:$port/api/health" 2>/dev/null; then
      log "就绪（${i}s）：http://localhost:$port/requirements"
      return 0
    fi
    sleep 1
  done
  log "警告：健康检查超时，日志见 .dev-server.log；可稍后访问确认" >&2
  return 1
}

stop() {
  if ! pid_of; then
    log "没有运行中的 dev server（PID 文件不存在或进程已退出）"
    rm -f "$PID_FILE"
    return 0
  fi
  local pid
  pid=$(cat "$PID_FILE")
  log "停止 dev server（PID ${pid}）"
  kill "$pid" 2>/dev/null
  # 等待退出，必要时兜底清理 next dev 相关进程（含子进程，与端口无关）
  local i
  for i in $(seq 1 10); do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.5
  done
  pkill -f "next dev" 2>/dev/null
  rm -f "$PID_FILE" "$PORT_FILE"
  log "已停止"
}

status() {
  if pid_of; then
    local pid port code
    pid=$(cat "$PID_FILE")
    port=$(read_port)
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$port/api/health" 2>/dev/null || echo '未响应')
    log "运行中：PID ${pid}，http://localhost:${port}  /api/health -> ${code}"
  else
    log "未运行"
    rm -f "$PID_FILE" "$PORT_FILE"
  fi
}

case "${1:-}" in
  start) PORT="${2:-$DEFAULT_PORT}"; start ;;
  stop) stop ;;
  status) status ;;
  *) log "用法：./dev.sh {start [端口]|stop|status}" >&2; exit 1 ;;
esac
