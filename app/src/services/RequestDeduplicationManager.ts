import { useRef } from 'react';
import { DEFAULT_GAME_CONFIG } from './GameConfig';

interface RequestRecord {
  type: string;
  content: string;
  timestamp: number;
}

export class RequestDeduplicationManager {
  private lastRequestRef: React.MutableRefObject<RequestRecord | null>;

  constructor() {
    this.lastRequestRef = { current: null } as React.MutableRefObject<RequestRecord | null>;
  }

  isDuplicateRequest(type: string, content: string): boolean {
    const now = Date.now();
    const lastRequest = this.lastRequestRef.current;
    
    if (!lastRequest) return false;
    
    // Consider duplicate if same type+content within configured window
    return (
      lastRequest.type === type &&
      lastRequest.content === content &&
      now - lastRequest.timestamp < DEFAULT_GAME_CONFIG.requestDeduplicationWindow
    );
  }

  recordRequest(type: string, content: string): void {
    this.lastRequestRef.current = {
      type,
      content,
      timestamp: Date.now()
    };
  }
}

export const useRequestDeduplication = () => {
  const lastRequestRef = useRef<RequestRecord | null>(null);
  
  const isDuplicateRequest = (type: string, content: string): boolean => {
    const now = Date.now();
    const lastRequest = lastRequestRef.current;
    
    if (!lastRequest) return false;
    
    return (
      lastRequest.type === type &&
      lastRequest.content === content &&
      now - lastRequest.timestamp < DEFAULT_GAME_CONFIG.requestDeduplicationWindow
    );
  };
  
  const recordRequest = (type: string, content: string) => {
    lastRequestRef.current = {
      type,
      content,
      timestamp: Date.now()
    };
  };

  return { isDuplicateRequest, recordRequest };
};