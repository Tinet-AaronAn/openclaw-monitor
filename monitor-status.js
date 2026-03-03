#!/usr/bin/env node

/**
 * 监控状态报告生成器
 */

const API_URL = 'http://localhost:3011';
// 生产模式：所有服务在 3011 端口
// 开发模式：前端 5174，API 3011

async function generateReport() {
  const response = await fetch(`${API_URL}/api/state`);
  const state = await response.json();

  const activeRuns = state.runs.filter(r => r.status === 'running').length;
  const completedRuns = state.runs.filter(r => r.status === 'completed').length;

  console.log(`
╔════════════════════════════════════════════════════════════╗
║          🦞 OpenClaw Monitor - 当前状态                    ║
╚════════════════════════════════════════════════════════════╝

📊 统计信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  会话数量      : ${state.sessions.length}
  运行总数      : ${state.runs.length}
  活跃运行      : ${activeRuns} ${activeRuns > 0 ? '🔥' : '💤'}
  已完成运行    : ${completedRuns}
  事件总数      : ${state.events.length}

🔄 最近 5 次运行
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${state.runs.slice(0, 5).map(run => {
  const emoji = run.status === 'completed' ? '✅' :
                run.status === 'running' ? '▶️' : '❓';
  const time = new Date(run.startedAt).toLocaleTimeString('zh-CN');
  return `  ${emoji} ${run.runId.slice(-8)} | ${run.status.padEnd(10)} | ${run.eventCount} events | ${time}`;
}).join('\n')}

📨 最近 5 个事件
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${state.events.slice(-5).reverse().map(event => {
  const streamEmoji = {
    'lifecycle': '🔄',
    'tool': '🔧',
    'assistant': '💬',
    'error': '❌'
  }[event.stream] || '📄';
  const time = new Date(event.ts).toLocaleTimeString('zh-CN');
  const dataPreview = JSON.stringify(event.data).slice(0, 40);
  return `  ${streamEmoji} ${time} | ${event.stream.padEnd(10)} | ${dataPreview}...`;
}).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📅 更新时间: ${new Date().toLocaleString('zh-CN')}
  🌐 Web 界面: http://localhost:3011/
  🔌 API 服务: http://localhost:3011/api/state
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

generateReport().catch(console.error);
