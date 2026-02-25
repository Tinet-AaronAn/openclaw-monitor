# OpenClaw Monitor - 公网访问说明

## 🌐 公网访问地址

**监控界面：** https://openclaw-monitor.loca.lt

## ⚠️ 首次访问说明

LocalTunnel 首次访问需要 IP 验证：

1. 点击链接 https://openclaw-monitor.loca.lt
2. 会看到一个验证页面
3. 点击 "Continue" 按钮
4. 即可正常访问监控界面

## 🔧 管理命令

```bash
# 查看隧道状态
ps aux | grep lt

# 重启隧道
pkill -f "lt --port"
lt --port 5174 --subdomain openclaw-monitor &

# 停止隧道
pkill -f "lt --port"
```

## 📊 监控数据

- Web 界面：https://openclaw-monitor.loca.lt
- API（本地）：http://localhost:3011/api/state
- WebSocket（本地）：ws://localhost:3012

## 🔄 工作原理

```
手机浏览器
    ↓
https://openclaw-monitor.loca.lt (LocalTunnel)
    ↓
http://localhost:5174 (Vite 开发服务器)
    ↓
http://localhost:3011 (API 服务器)
```

Vite 自动将 `/api/*` 请求代理到本地 API 服务器。

## 🎯 下次使用

如果隧道停止，重新启动：

```bash
cd ~/.openclaw/workspace/projects/openclaw-monitor

# 启动监控应用
npm run dev &

# 启动公网隧道
lt --port 5174 --subdomain openclaw-monitor &
```

## 📝 注意事项

- 公网地址在隧道重启后会变化（免费版）
- 如需固定域名，可以使用 ngrok 付费版
- 数据通过 HTTPS 加密传输
