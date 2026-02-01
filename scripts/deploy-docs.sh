#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REMOTE_NAME="${REMOTE_NAME:-origin}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-gh-pages}"
DIST_DIR="${DIST_DIR:-$ROOT_DIR/.vitepress/dist}"
WORKTREE_DIR="${WORKTREE_DIR:-$ROOT_DIR/.tmp-gh-pages}"
CNAME_DOMAIN="${CNAME_DOMAIN:-inkwell.ede.ink}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"

if ! command -v git >/dev/null 2>&1; then
  echo "未找到 git，请先安装。"
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "当前目录不是 git 仓库：$ROOT_DIR"
  exit 1
fi

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  echo "未找到远端：$REMOTE_NAME"
  exit 1
fi

if [ "$ALLOW_DIRTY" != "1" ]; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "存在未提交的代码变更，请先提交或暂存后再部署。"
    echo "如需强制部署，可使用：ALLOW_DIRTY=1 pnpm run doc:deploy"
    exit 1
  fi
else
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "检测到未提交的代码变更：已启用 ALLOW_DIRTY=1，继续部署。"
  fi
fi

echo "开始构建文档..."
pnpm run doc:build

if [ ! -d "$DIST_DIR" ]; then
  echo "未找到构建产物目录：$DIST_DIR"
  exit 1
fi

git worktree prune >/dev/null 2>&1 || true

if [ -d "$WORKTREE_DIR" ]; then
  git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
  rm -rf "$WORKTREE_DIR"
fi

git fetch "$REMOTE_NAME" "$DEPLOY_BRANCH" --depth=1 >/dev/null 2>&1 || true

if git show-ref --verify --quiet "refs/remotes/$REMOTE_NAME/$DEPLOY_BRANCH"; then
  git worktree add -B "$DEPLOY_BRANCH" "$WORKTREE_DIR" "$REMOTE_NAME/$DEPLOY_BRANCH" >/dev/null
else
  git worktree add -B "$DEPLOY_BRANCH" "$WORKTREE_DIR" >/dev/null
fi

cleanup() {
  cd "$ROOT_DIR" >/dev/null 2>&1 || true
  git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
  rm -rf "$WORKTREE_DIR" >/dev/null 2>&1 || true
}

trap cleanup EXIT

cd "$WORKTREE_DIR"

find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

cp -R "$DIST_DIR"/. "$WORKTREE_DIR"/

echo "$CNAME_DOMAIN" > CNAME
touch .nojekyll

git add -A

if git diff --cached --quiet; then
  echo "本次构建与 gh-pages 内容一致，无需发布。"
  exit 0
fi

git commit -m "部署文档：$(date '+%Y-%m-%d %H:%M:%S')" >/dev/null
git push "$REMOTE_NAME" "$DEPLOY_BRANCH"

echo "部署完成：已推送到 ${REMOTE_NAME}/${DEPLOY_BRANCH}，CNAME=${CNAME_DOMAIN}"
