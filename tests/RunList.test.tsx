import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunList } from '../src/client/components/RunList';
import type { Run } from '../src/client/types';

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => 'less than a minute ago',
}));

describe('RunList Component', () => {
  const mockRuns: Run[] = [
    {
      runId: 'run-1-active',
      sessionKey: 'session-1',
      status: 'running',
      startedAt: Date.now() - 1000,
      eventCount: 5,
    },
    {
      runId: 'run-2-completed',
      sessionKey: 'session-1',
      status: 'completed',
      startedAt: Date.now() - 2000,
      eventCount: 10,
    },
    {
      runId: 'run-3-failed',
      sessionKey: 'session-2',
      status: 'failed',
      startedAt: Date.now() - 3000,
      eventCount: 3,
    },
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should show empty state when no runs', () => {
    render(<RunList runs={[]} selectedRun={null} onSelect={mockOnSelect} />);
    expect(screen.getByText('No runs found')).toBeInTheDocument();
  });

  it('should show only active runs by default', () => {
    render(<RunList runs={mockRuns} selectedRun={null} onSelect={mockOnSelect} />);
    
    // 默认显示 active only，所以只有 running 状态的 run
    expect(screen.getByText('run-1-active'.slice(-12))).toBeInTheDocument();
    expect(screen.queryByText('run-2-completed'.slice(-12))).not.toBeInTheDocument();
    expect(screen.queryByText('run-3-failed'.slice(-12))).not.toBeInTheDocument();
  });

  it('should toggle filter when clicking Active Only button', () => {
    render(<RunList runs={mockRuns} selectedRun={null} onSelect={mockOnSelect} />);
    
    const filterButton = screen.getByText('✓ Active Only');
    fireEvent.click(filterButton);
    
    // 切换后显示所有 runs
    expect(screen.getByText('run-1-active'.slice(-12))).toBeInTheDocument();
    expect(screen.getByText('run-2-completed'.slice(-12))).toBeInTheDocument();
    expect(screen.getByText('run-3-failed'.slice(-12))).toBeInTheDocument();
  });

  it('should display status badges correctly', () => {
    render(<RunList runs={mockRuns} selectedRun={null} onSelect={mockOnSelect} />);
    
    // 点击 Show All 按钮
    fireEvent.click(screen.getByText('✓ Active Only'));
    
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('should call onSelect when clicking a run', () => {
    render(<RunList runs={mockRuns} selectedRun={null} onSelect={mockOnSelect} />);
    
    const firstRunButton = screen.getByText('run-1-active'.slice(-12)).closest('button');
    if (firstRunButton) {
      fireEvent.click(firstRunButton);
    }
    
    expect(mockOnSelect).toHaveBeenCalledWith('run-1-active');
  });

  it('should highlight selected run', () => {
    render(<RunList runs={mockRuns} selectedRun="run-1-active" onSelect={mockOnSelect} />);
    
    const selectedRun = screen.getByText('run-1-active'.slice(-12)).closest('button');
    expect(selectedRun).toHaveClass('border-blue-500');
  });

  it('should display event count', () => {
    render(<RunList runs={mockRuns} selectedRun={null} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should show active count indicator', () => {
    render(<RunList runs={mockRuns} selectedRun={null} onSelect={mockOnSelect} />);
    
    expect(screen.getByText(/1 active 🔥/)).toBeInTheDocument();
  });

  it('should sort runs with running status first', () => {
    render(<RunList runs={mockRuns} selectedRun={null} onSelect={mockOnSelect} />);
    
    // 点击 Show All
    fireEvent.click(screen.getByText('✓ Active Only'));
    
    const runButtons = screen.getAllByRole('button').filter(btn => 
      btn.className.includes('rounded-lg') && btn.className.includes('p-4')
    );
    
    // running 状态应该在前面
    const firstRunButton = runButtons[0];
    expect(firstRunButton?.textContent).toContain('▶️'); // 第一个 run 应该是 running
  });
});
