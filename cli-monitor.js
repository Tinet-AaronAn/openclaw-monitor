#!/usr/bin/env node

/**
 * OpenClaw Monitor - CLI Version
 * 终端版监控工具
 */

const API_URL = 'http://localhost:3011';

async function fetchState() {
  try {
    const response = await fetch(`${API_URL}/api/state`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch state:', error.message);
    return null;
  }
}

function formatTime(ts) {
  const date = new Date(ts);
  return date.toLocaleTimeString('zh-CN');
}

function getStatusEmoji(status) {
  switch (status) {
    case 'running': return '▶️';
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'aborted': return '⚠️';
    default: return '❓';
  }
}

function clearScreen() {
  console.clear();
}

async function monitor() {
  clearScreen();

  console.log('🦞 OpenClaw Monitor (CLI Version)');
  console.log('='.repeat(60));
  console.log();

  const state = await fetchState();

  if (!state) {
    console.log('❌ 无法连接到监控服务器');
    console.log('请确保服务器正在运行: npm run dev');
    return;
  }

  // 统计信息
  console.log('📊 统计信息');
  console.log('-'.repeat(60));
  console.log(`会话数量: ${state.sessions.length}`);
  console.log(`运行数量: ${state.runs.length}`);
  console.log(`事件数量: ${state.events.length}`);

  const activeRuns = state.runs.filter(r => r.status === 'running').length;
  console.log(`活跃运行: ${activeRuns}`);
  console.log();

  // 最近的运行
  console.log('🔄 最近运行');
  console.log('-'.repeat(60));

  const recentRuns = state.runs.slice(0, 5);
  for (const run of recentRuns) {
    const emoji = getStatusEmoji(run.status);
    const time = formatTime(run.startedAt);
    const runId = run.runId.slice(-8);
    console.log(`${emoji} [${runId}] ${run.status} - ${run.eventCount} events - ${time}`);
  }
  console.log();

  // 最近的事件
  console.log('📨 最近事件');
  console.log('-'.repeat(60));

  const recentEvents = state.events.slice(-5).reverse();
  for (const event of recentEvents) {
    const time = formatTime(event.ts);
    const streamEmoji = {
      'lifecycle': '🔄',
      'tool': '🔧',
      'assistant': '💬',
      'error': '❌'
    }[event.stream] || '📄';

    const dataPreview = JSON.stringify(event.data).slice(0, 50);
    console.log(`${streamEmoji} [${time}] ${event.stream}: ${dataPreview}...`);
  }
  console.log();

  // 更新时间
  console.log('='.repeat(60));
  console.log(`最后更新: ${new Date().toLocaleTimeString('zh-CN')}`);
  console.log('按 Ctrl+C 退出');
}

// 主循环
console.log('启动监控... (每 2 秒更新)');
monitor();

// 每 2 秒更新
setInterval(monitor, 2000);

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n👋 监控已停止');
  process.exit(0);
});
