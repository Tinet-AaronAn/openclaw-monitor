#!/bin/bash

# OpenClaw Monitor 截图脚本
# 使用系统自带的 screencapture 命令

echo "📸 准备截取 OpenClaw Monitor 界面..."
echo "请在浏览器中打开: http://localhost:5174/"
echo ""
echo "按 Enter 键开始截图..."
read

# 等待 3 秒让用户切换到浏览器窗口
echo "3 秒后开始截图..."
sleep 3

# 截图
SCREENSHOT_PATH="$HOME/.openclaw/workspace/projects/openclaw-monitor/monitor-$(date +%Y%m%d-%H%M%S).png"
screencapture -x "$SCREENSHOT_PATH"

echo "✅ 截图已保存到: $SCREENSHOT_PATH"
echo ""
echo "查看截图:"
echo "  open \"$SCREENSHOT_PATH\""
