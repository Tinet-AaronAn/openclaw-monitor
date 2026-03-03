# OpenClaw Monitor - PM2 管理指南

## 📊 当前配置

**PM2 配置文件：** `ecosystem.config.cjs`

**运行的服务：**
- `openclaw-monitor-server` - 后端 API 服务
- `openclaw-monitor-client` - 前端 Web 服务

## 🚀 快速命令

### 启动服务
```bash
cd ~/.openclaw/workspace/projects/openclaw-monitor
pm2 start ecosystem.config.cjs
```

### 查看状态
```bash
pm2 list
```

### 查看日志
```bash
# 所有日志
pm2 logs

# 特定服务
pm2 logs openclaw-monitor-server
pm2 logs openclaw-monitor-client

# 实时日志（Ctrl+C 退出）
pm2 logs --lines 100
```

### 重启服务
```bash
# 重启所有
pm2 restart all

# 重启特定服务
pm2 restart openclaw-monitor-server
pm2 restart openclaw-monitor-client
```

### 停止服务
```bash
# 停止所有
pm2 stop all

# 停止特定服务
pm2 stop openclaw-monitor-server
```

### 删除服务
```bash
pm2 delete all
pm2 delete openclaw-monitor-server
```

## 🔧 开机自启

### 设置开机自启（需要密码）
```bash
sudo env PATH=$PATH:/usr/local/Cellar/node/23.1.0_1/bin pm2 startup launchd -u aaronan --hp /Users/aaronan
```

### 保存当前配置
```bash
pm2 save
```

### 取消开机自启
```bash
pm2 unstartup launchd
```

## 📈 监控

### 实时监控
```bash
pm2 monit
```

### 查看详细信息
```bash
pm2 show openclaw-monitor-server
pm2 describe openclaw-monitor-server
```

### 查看 CPU/内存使用
```bash
pm2 list
```

## 🐛 故障排查

### 查看错误日志
```bash
pm2 logs --err
```

### 查看最近的重启记录
```bash
pm2 list
# 查看 "↺" 列（重启次数）
```

### 清空日志
```bash
pm2 flush
```

### 重新加载配置
```bash
pm2 restart all --update-env
```

## 💡 高级功能

### 集群模式（多进程）
```bash
pm2 start ecosystem.config.cjs -i max
```

### 内存限制自动重启
在 `ecosystem.config.cjs` 中添加：
```javascript
max_memory_restart: '500M'
```

### 定时重启
```bash
pm2 start ecosystem.config.cjs --cron-restart="0 3 * * *"
```

## 📝 快捷别名

添加到 `~/.zshrc` 或 `~/.bashrc`：

```bash
# OpenClaw Monitor 快捷命令
alias monitor='cd ~/.openclaw/workspace/projects/openclaw-monitor'
alias monitor-start='pm2 start ~/.openclaw/workspace/projects/openclaw-monitor/ecosystem.config.cjs'
alias monitor-stop='pm2 stop all'
alias monitor-restart='pm2 restart all'
alias monitor-logs='pm2 logs'
alias monitor-status='pm2 list'
```

使用：
```bash
source ~/.zshrc
monitor-status
```

## 🌐 访问地址

**开发模式：**
- 前端开发服务器：http://localhost:5174/（Vite，热更新）
- API：http://localhost:3011/
- WebSocket：ws://localhost:3012/

**生产模式（PM2）：**
- 所有服务（Web + API）：http://localhost:3011/
- WebSocket：ws://localhost:3012/
- Health：http://localhost:3011/health

## 📚 参考文档

- [PM2 官方文档](https://pm2.keymetrics.io/)
- [PM2 GitHub](https://github.com/Unitech/pm2)
- [OpenClaw Monitor README](../README.md)

---

**最后更新：** 2026-02-24
**维护者：** 陆测 🧪
