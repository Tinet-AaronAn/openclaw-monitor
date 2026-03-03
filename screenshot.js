#!/usr/bin/env node

/**
 * 使用 Playwright 截取监控界面
 */

import { chromium } from 'playwright';

async function screenshot() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 访问监控界面
  // 生产模式：http://localhost:3011/
  // 开发模式：http://localhost:5174/
  const url = process.env.NODE_ENV === 'development' ? 'http://localhost:5174/' : 'http://localhost:3011/';
  await page.goto(url, { waitUntil: 'networkidle' });

  // 等待数据加载
  await page.waitForTimeout(2000);

  // 截图
  await page.screenshot({
    path: '/Users/aaronan/.openclaw/workspace/projects/openclaw-monitor/monitor-screenshot.png',
    fullPage: true
  });

  console.log('Screenshot saved to: monitor-screenshot.png');

  await browser.close();
}

screenshot().catch(console.error);
