// Test setup file
// This file runs before each test file

import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock global objects that might not be available in test environment
global.fetch = vi.fn();

// Mock WebSocket for tests that don't use real WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    // Auto-connect after small delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  send(data: string) {}

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close"));
    }
  }
}

// Only set WebSocket mock if not already defined
if (typeof global.WebSocket === "undefined") {
  global.WebSocket = MockWebSocket as any;
}

// Mock navigator
Object.defineProperty(global, "navigator", {
  value: {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    clipboard: {
      writeText: vi.fn(() => Promise.resolve()),
      readText: vi.fn(() => Promise.resolve("")),
    },
  },
  writable: true,
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
