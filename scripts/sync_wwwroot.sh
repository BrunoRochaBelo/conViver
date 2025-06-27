#!/bin/bash
set -e
# Synchronize web client assets from source folders to wwwroot
SRC_DIR="$(dirname "$0")/.."
WEB_DIR="$SRC_DIR/conViver.Web"

mkdir -p "$WEB_DIR/wwwroot/pages" "$WEB_DIR/wwwroot/css" "$WEB_DIR/wwwroot/js"

rsync -a --delete "$WEB_DIR/pages/" "$WEB_DIR/wwwroot/pages/"
rsync -a --delete "$WEB_DIR/css/" "$WEB_DIR/wwwroot/css/"
rsync -a --delete "$WEB_DIR/js/" "$WEB_DIR/wwwroot/js/"

# Also copy top-level html files
rsync -a "$WEB_DIR/index.html" "$WEB_DIR/login.html" "$WEB_DIR/forgot-password.html" \
      "$WEB_DIR/register.html" "$WEB_DIR/reset-password.html" "$WEB_DIR/layout.html" "$WEB_DIR/wwwroot/"

