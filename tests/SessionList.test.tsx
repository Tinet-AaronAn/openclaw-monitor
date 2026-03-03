import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionList } from '../src/client/components/SessionList';
import type { Session, Run } from '../src/client/types';

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => 'less than a minute ago',
}));

describe('SessionList Component', () => {
  const mockSessions: Session[] = [
    {
      sessionKey: 'session-1-active',
      sessionId: 'session-1',
      updatedAt: Date.now() - 1000,
      channel: 'webchat',
      model: 'zai/glm-5',
    },
    {
      sessionKey: 'session-2-inactive',
      sessionId: 'session-2',
      updatedAt: Date.now() - 2000,
      channel: 'telegram',
      model: 'zai/glm-4',
    },
  ];

  const mockRuns: Run[] = [
    {
      runId: 'run-1',
      sessionKey: 'session-1-active',
      status: 'running',
      startedAt: Date.now() - 1000,
      eventCount: 5,
    },
    {
      runId: 'run-2',
      sessionKey: 'session-2-inactive',
      status: 'completed',
      startedAt: Date.now() - 2000,
      eventCount: 10,
    },
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should show demo session when no sessions', () => {
    render(<SessionList sessions={[]} runs={[]} selectedSession={null} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('🎯 demo-session')).toBeInTheDocument();
  });

  it('should show only active sessions by default', () => {
    render(<SessionList sessions={mockSessions} runs={mockRuns} selectedSession={null} onSelect={mockOnSelect} />);
    
    // session-1-active 有 running 状态的 run，应该显示
    expect(screen.getByText(/session-1-active/)).toBeInTheDocument();
    // session-2-inactive 没有 active run，默认不显示
    expect(screen.queryByText(/session-2-inactive/)).not.toBeInTheDocument();
  });

  it('should toggle filter when clicking Active Only button', () => {
    render(<SessionList sessions={mockSessions} runs={mockRuns} selectedSession={null} onSelect={mockOnSelect} />);
    
    const filterButton = screen.getByText('✓ Active Only');
    fireEvent.click(filterButton);
    
    // 切换后显示所有 sessions
    expect(screen.getByText(/session-1-active/)).toBeInTheDocument();
    expect(screen.getByText(/session-2-inactive/)).toBeInTheDocument();
  });

  it('should display channel info', () => {
    render(<SessionList sessions={mockSessions} runs={mockRuns} selectedSession={null} onSelect={mockOnSelect} />);
    
    // 点击 Show All
    fireEvent.click(screen.getByText('✓ Active Only'));
    
    expect(screen.getByText('webchat')).toBeInTheDocument();
    expect(screen.getByText('telegram')).toBeInTheDocument();
  });

  it('should display run count', () => {
    render(<SessionList sessions={mockSessions} runs={mockRuns} selectedSession={null} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('1')).toBeInTheDocument(); // session-1 有 1 个 run
  });

  it('should call onSelect when clicking a session', () => {
    render(<SessionList sessions={mockSessions} runs={mockRuns} selectedSession={null} onSelect={mockOnSelect} />);
    
    const firstSessionButton = screen.getByText(/session-1-active/).closest('button');
    if (firstSessionButton) {
      fireEvent.click(firstSessionButton);
    }
    
    expect(mockOnSelect).toHaveBeenCalledWith('session-1-active');
  });

  it('should highlight selected session', () => {
    render(<SessionList sessions={mockSessions} runs={mockRuns} selectedSession="session-1-active" onSelect={mockOnSelect} />);
    
    const selectedSession = screen.getByText(/session-1-active/).closest('button');
    expect(selectedSession).toHaveClass('border-blue-500');
  });

  it('should show active indicator for sessions with running runs', () => {
    render(<SessionList sessions={mockSessions} runs={mockRuns} selectedSession={null} onSelect={mockOnSelect} />);
    
    expect(screen.getByText(/1 🔥/)).toBeInTheDocument();
  });

  it('should truncate long session keys', () => {
    const longSession: Session = {
      sessionKey: 'this-is-a-very-long-session-key-that-should-be-truncated-when-displayed',
      sessionId: 'long-session',
      updatedAt: Date.now(),
      channel: 'webchat',
    };

    render(<SessionList sessions={[longSession]} runs={[]} selectedSession={null} onSelect={mockOnSelect} />);
    
    // 点击 Show All
    fireEvent.click(screen.getByText('✓ Active Only'));
    
    // 应该显示截断后的文本
    expect(screen.getByText(/this-is-a-very-long-session-key-th.../)).toBeInTheDocument();
  });
});
