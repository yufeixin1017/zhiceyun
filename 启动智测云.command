#!/bin/zsh

# 智测云 macOS 双击启动器
# 所有 PATH 修改仅对当前脚本及其子进程有效，不修改系统配置。
set -u

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_HOME="/Users/xinyanbin/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin"
NODE="$NODE_HOME/node"
PNPM="/Users/xinyanbin/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.mjs"
PORT="${ZHICE_PORT:-3000}"
BASE_URL="http://127.0.0.1:$PORT"
SERVER_PID=""

pause_on_error() {
  print -u2 "\n启动失败：$1"
  if [[ -t 0 ]]; then
    read "?按回车键关闭此窗口…"
  fi
  exit 1
}

cleanup() {
  trap - EXIT INT TERM HUP
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1
    wait "$SERVER_PID" >/dev/null 2>&1
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

cd "$PROJECT_DIR" || pause_on_error "无法进入项目目录：$PROJECT_DIR"
[[ -x "$NODE" ]] || pause_on_error "未找到 DeepSeek Harness 自带的 Node.js：$NODE"
[[ -f "$PNPM" ]] || pause_on_error "未找到 DeepSeek Harness 自带的 pnpm：$PNPM"

# 只影响这个启动器窗口，不写入 ~/.zshrc 或系统环境变量。
export PATH="$NODE_HOME:$PATH"

clear
print "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print "            智测云 · 双击启动器"
print "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print "项目目录：$PROJECT_DIR"
print "访问地址：$BASE_URL"
print ""

# 如果本应用已经在运行，直接打开页面，避免重复启动和端口冲突。
EXISTING_CONFIG="$(/usr/bin/curl -fsS --max-time 2 "$BASE_URL/api/config" 2>/dev/null || true)"
if [[ "$EXISTING_CONFIG" == *'"aiConfigured"'* ]]; then
  print "智测云已经在运行，正在打开浏览器…"
  if [[ "${ZHICE_OPEN_BROWSER:-1}" != "0" ]]; then
    /usr/bin/open "$BASE_URL"
  fi
  exit 0
fi

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  pause_on_error "端口 $PORT 已被其他程序占用。请先关闭占用该端口的程序，再重新双击启动。"
fi

if [[ ! -d "node_modules/next" || ! -d "node_modules/@next/swc-wasm-nodejs" ]]; then
  print "首次运行，正在安装项目依赖，请保持网络连接…"
  "$NODE" "$PNPM" install || pause_on_error "依赖安装失败，请检查网络后重试。"
fi

print "正在检查并构建最新版本…"
"$NODE" "$PNPM" build || pause_on_error "项目构建失败，请查看上方错误信息。"

print "正在启动智测云…"
"$NODE" "$PNPM" start --hostname 127.0.0.1 --port "$PORT" &
SERVER_PID=$!

READY=0
for ((ATTEMPT = 1; ATTEMPT <= 60; ATTEMPT++)); do
  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    wait "$SERVER_PID"
    pause_on_error "服务提前退出，请查看上方日志。"
  fi
  if /usr/bin/curl -fsS --max-time 1 "$BASE_URL/api/config" >/dev/null 2>&1; then
    READY=1
    break
  fi
  /bin/sleep 0.5
done

[[ "$READY" == "1" ]] || pause_on_error "服务启动超时，请查看上方日志。"

print ""
print "✓ 智测云启动成功！"
print "✓ 浏览器地址：$BASE_URL"
print ""
print "请保持此窗口开启。按 Control + C 可停止服务。"
print ""

if [[ "${ZHICE_OPEN_BROWSER:-1}" != "0" ]]; then
  /usr/bin/open "$BASE_URL"
fi

wait "$SERVER_PID"
