import React from 'react';
import { render } from '@testing-library/react-native';
import { MessagesList } from '../MessagesList';
import { GameMessage } from '../../types/types';

describe('MessagesList', () => {
  const mockMessages: GameMessage[] = [
    {
      id: '1',
      game_id: 'test-game',
      role: 'user',
      content: 'Is it an animal?',
      message_type: 'question',
      question_number: 1,
      created_at: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      game_id: 'test-game',
      role: 'assistant',
      content: 'Yes, it is an animal.',
      message_type: 'answer',
      question_number: 1,
      created_at: '2024-01-01T10:00:01Z',
    },
    {
      id: '3',
      game_id: 'test-game',
      role: 'user',
      content: 'Is it a mammal?',
      message_type: 'question',
      question_number: 2,
      created_at: '2024-01-01T10:01:00Z',
    },
    {
      id: '4',
      game_id: 'test-game',
      role: 'assistant',
      content: 'No, it is not a mammal.',
      message_type: 'answer',
      question_number: 2,
      created_at: '2024-01-01T10:01:01Z',
    },
  ];

  const defaultProps = {
    messages: mockMessages,
    sending: false,
  };

  it('renders correctly', () => {
    const { getByText } = render(<MessagesList {...defaultProps} />);
    
    expect(getByText('Is it an animal?')).toBeTruthy();
    expect(getByText('Yes, it is an animal.')).toBeTruthy();
    expect(getByText('Is it a mammal?')).toBeTruthy();
    expect(getByText('No, it is not a mammal.')).toBeTruthy();
  });

  it('renders empty list when no messages', () => {
    const { queryByText } = render(<MessagesList messages={[]} sending={false} />);
    
    expect(queryByText('Is it an animal?')).toBeNull();
  });

  it('shows loading indicator when sending', () => {
    const { getByTestId } = render(<MessagesList {...defaultProps} sending={true} />);
    
    expect(getByTestId('typing-indicator')).toBeTruthy();
  });

  it('does not show loading indicator when not sending', () => {
    const { queryByRole } = render(<MessagesList {...defaultProps} sending={false} />);
    
    expect(queryByRole('progressbar')).toBeNull();
  });

  it('renders hint messages correctly', () => {
    const hintMessages: GameMessage[] = [
      {
        id: '5',
        game_id: 'test-game',
        role: 'assistant',
        content: 'Here is a hint: It flies in the sky.',
        message_type: 'hint',
        question_number: 3,
        created_at: '2024-01-01T10:02:00Z',
      },
    ];
    
    const { getByText } = render(<MessagesList messages={hintMessages} sending={false} />);
    
    expect(getByText('Here is a hint: It flies in the sky.')).toBeTruthy();
  });

  it('renders user and assistant messages with different styles', () => {
    const { getByText } = render(<MessagesList {...defaultProps} />);
    
    const userMessage = getByText('Is it an animal?');
    const assistantMessage = getByText('Yes, it is an animal.');
    
    expect(userMessage).toBeTruthy();
    expect(assistantMessage).toBeTruthy();
  });

  it('renders single message correctly', () => {
    const singleMessage: GameMessage[] = [
      {
        id: '6',
        game_id: 'test-game',
        role: 'user',
        content: 'Hello!',
        message_type: 'question',
        question_number: 1,
        created_at: '2024-01-01T10:03:00Z',
      },
    ];
    
    const { getByText } = render(<MessagesList messages={singleMessage} sending={false} />);
    
    expect(getByText('Hello!')).toBeTruthy();
  });
});