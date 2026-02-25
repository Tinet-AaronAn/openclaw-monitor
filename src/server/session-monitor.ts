import { watch, FSWatcher } from 'chokidar';
import { readFile, readdir } from 'fs/promises';
import { join, basename } from 'path';
import type { SessionEntry } from './types.js';

export class SessionMonitor {
  private sessionsDir: string;
  private watcher: FSWatcher | null = null;
  private sessions: Map<string, SessionEntry> = new Map();
  private onUpdate: ((sessionKey: string, entry: SessionEntry) => void) | null = null;

  constructor(sessionsDir: string) {
    this.sessionsDir = sessionsDir;
  }

  async start(): Promise<void> {
    // Initial load
    await this.loadAllSessions();

    // Watch for changes
    this.watcher = watch(this.sessionsDir, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (path) => this.handleFileChange(path))
      .on('change', (path) => this.handleFileChange(path))
      .on('unlink', (path) => this.handleFileDelete(path));
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  setUpdateCallback(callback: (sessionKey: string, entry: SessionEntry) => void): void {
    this.onUpdate = callback;
  }

  getSessions(): Map<string, SessionEntry> {
    return new Map(this.sessions);
  }

  private async loadAllSessions(): Promise<void> {
    try {
      const files = await readdir(this.sessionsDir);
      const sessionFiles = files.filter((f) => f.endsWith('.session.json'));

      for (const file of sessionFiles) {
        await this.loadSession(join(this.sessionsDir, file));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }

  private async loadSession(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const sessionKey = basename(filePath, '.session.json');
      const entry: SessionEntry = JSON.parse(content);

      this.sessions.set(sessionKey, entry);

      if (this.onUpdate) {
        this.onUpdate(sessionKey, entry);
      }
    } catch (error) {
      console.error(`Error loading session ${filePath}:`, error);
    }
  }

  private async handleFileChange(path: string): Promise<void> {
    if (path.endsWith('.session.json')) {
      await this.loadSession(path);
    }
  }

  private handleFileDelete(path: string): void {
    if (path.endsWith('.session.json')) {
      const sessionKey = basename(path, '.session.json');
      this.sessions.delete(sessionKey);
    }
  }
}
