import { GameState, GameMessage, GameStatus } from '../../../shared/types';

export interface StateUpdater {
  canUpdate(key: string): boolean;
  update(currentValue: any, newValue: any): any;
}

export class StringStateUpdater implements StateUpdater {
  private validKeys = ['gameId', 'secretItem'];
  
  canUpdate(key: string): boolean {
    return this.validKeys.includes(key);
  }
  
  update(currentValue: string | null, newValue: string | null): string | null {
    return newValue;
  }
}

export class BooleanStateUpdater implements StateUpdater {
  private validKeys = ['loading', 'sending', 'showResultModal'];
  
  canUpdate(key: string): boolean {
    return this.validKeys.includes(key);
  }
  
  update(currentValue: boolean, newValue: boolean): boolean {
    return newValue;
  }
}

export class NumberStateUpdater implements StateUpdater {
  private validKeys = ['questionsRemaining', 'hintsRemaining'];
  
  canUpdate(key: string): boolean {
    return this.validKeys.includes(key);
  }
  
  update(currentValue: number, newValue: number): number {
    return newValue;
  }
}

export class MessagesStateUpdater implements StateUpdater {
  canUpdate(key: string): boolean {
    return key === 'messages';
  }
  
  update(currentValue: GameMessage[], newValue: GameMessage[]): GameMessage[] {
    return [...newValue];
  }
}

export class GameStatusStateUpdater implements StateUpdater {
  canUpdate(key: string): boolean {
    return key === 'gameStatus';
  }
  
  update(currentValue: GameStatus, newValue: GameStatus): GameStatus {
    return newValue;
  }
}

export class ResultModalDataStateUpdater implements StateUpdater {
  canUpdate(key: string): boolean {
    return key === 'resultModalData';
  }
  
  update(currentValue: any, newValue: { isWin: boolean; title: string; message: string }) {
    return { ...newValue };
  }
}

export class StateUpdateStrategyManager {
  private updaters: StateUpdater[] = [
    new StringStateUpdater(),
    new BooleanStateUpdater(),
    new NumberStateUpdater(),
    new MessagesStateUpdater(),
    new GameStatusStateUpdater(),
    new ResultModalDataStateUpdater(),
  ];

  updateState(state: GameState, updates: Partial<GameState>): Partial<GameState> {
    const updatedState: Partial<GameState> = {};

    Object.entries(updates).forEach(([key, value]) => {
      const updater = this.updaters.find(u => u.canUpdate(key));
      if (updater) {
        updatedState[key as keyof GameState] = updater.update(state[key as keyof GameState], value);
      } else {
        // Fallback for unknown keys
        updatedState[key as keyof GameState] = value;
      }
    });

    return updatedState;
  }
}