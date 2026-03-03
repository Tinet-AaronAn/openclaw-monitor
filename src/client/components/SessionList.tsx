import { useState } from 'react';
import type { Session, Run } from '../types';
import { formatDistanceToNow } from 'date-fns';

type SessionListProps = {
  sessions: Session[];
  runs: Run[];
  selectedSession: string | null;
  onSelect: (sessionKey: string) => void;
};

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

export function SessionList({ sessions, runs, selectedSession, onSelect }: SessionListProps) {
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (e: React.MouseEvent, sessionKey: string) => {
    e.stopPropagation();
    const success = await copyToClipboard(sessionKey);
    if (success) {
      setCopiedKey(sessionKey);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  if (sessions.length === 0) {
    // Demo 模式：如果没有 session，创建一个虚拟的
    const demoSession: Session = {
      sessionKey: 'demo-session',
      sessionId: 'demo-session',
      updatedAt: Date.now(),
      channel: 'webchat',
      model: 'zai/glm-5',
    };

    const demoRuns = runs.filter(r => r.sessionKey === 'demo-session');

    return (
      <div className="p-4 space-y-2">
        <button
          onClick={() => onSelect('demo-session')}
          className={`w-full text-left p-4 rounded-lg transition-colors ${
            selectedSession === 'demo-session'
              ? 'bg-blue-50 border-2 border-blue-500'
              : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-mono text-sm font-medium text-slate-900">
              🎯 demo-session
            </div>
            <span className="text-xs text-slate-500">
              {formatDistanceToNow(demoSession.updatedAt, { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <span className="font-medium">Channel:</span>
              <span>{demoSession.channel}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Runs:</span>
              <span className="font-bold text-blue-600">{demoRuns.length}</span>
            </div>
          </div>
        </button>
      </div>
    );
  }

  // 计算 session 是否有 active runs
  const getSessionActiveRuns = (sessionKey: string) => {
    return runs.filter(r => r.sessionKey === sessionKey && r.status === 'running').length;
  };

  // 筛选和排序
  const filteredSessions = sessions
    .map(session => ({
      ...session,
      activeRuns: getSessionActiveRuns(session.sessionKey),
      totalRuns: runs.filter(r => r.sessionKey === session.sessionKey).length
    }))
    .filter(session => !showOnlyActive || session.activeRuns > 0)
    .sort((a, b) => {
      // active 优先排序
      if (a.activeRuns > 0 && b.activeRuns === 0) return -1;
      if (a.activeRuns === 0 && b.activeRuns > 0) return 1;
      // 其他按时间排序
      return b.updatedAt - a.updatedAt;
    });

  return (
    <div className="p-4 space-y-2">
      {/* 筛选按钮 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowOnlyActive(!showOnlyActive)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showOnlyActive
              ? 'bg-blue-500 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {showOnlyActive ? '✓ Active Only' : 'Show All'}
        </button>
        <div className="text-xs text-slate-500">
          {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Session 列表 */}
      <div className="max-h-[500px] overflow-y-auto space-y-2">
        {filteredSessions.map((session) => {
          const isActive = session.activeRuns > 0;

          return (
            <button
              key={session.sessionKey}
              onClick={() => onSelect(session.sessionKey)}
              className={`w-full text-left p-4 rounded-lg transition-colors ${
                selectedSession === session.sessionKey
                  ? 'bg-blue-50 border-2 border-blue-500'
                  : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                {/* Session 名称（可截断、tooltip、复制） */}
                <div 
                  className="flex items-center gap-2 flex-1 min-w-0"
                  onClick={(e) => handleCopy(e, session.sessionKey)}
                  title={session.sessionKey}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="font-mono text-sm font-medium text-slate-900 truncate">
                    {session.sessionKey.length > 35
                      ? `${session.sessionKey.slice(0, 35)}...`
                      : session.sessionKey}
                  </div>
                  {copiedKey === session.sessionKey ? (
                    <span className="text-xs text-green-600 flex-shrink-0">✓ Copied!</span>
                  ) : (
                    <span className="text-xs text-slate-400 flex-shrink-0">📋</span>
                  )}
                </div>
                
                <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                  {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-slate-600">
                {session.channel && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Channel:</span>
                    <span>{session.channel}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="font-medium">Runs:</span>
                  <span className="font-bold text-blue-600">{session.totalRuns}</span>
                </div>
                {isActive && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Active:</span>
                    <span className="font-bold text-orange-600">{session.activeRuns} 🔥</span>
                  </div>
                )}
              </div>
              
              {/* 最后一条消息 */}
              {session.lastMessage && (
                <div className="mt-2 p-2 bg-white/50 rounded text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-slate-500 flex-shrink-0">Last:</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-slate-700 truncate block">
                        {session.lastMessageSender && (
                          <span className="text-blue-600 font-medium">[{session.lastMessageSender}]</span>
                        )}{' '}
                        {session.lastMessage.length > 80 
                          ? `${session.lastMessage.slice(0, 80)}...` 
                          : session.lastMessage}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
