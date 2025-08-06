import React from 'react';
import { render } from '@testing-library/react-native';
import { MessagesList } from '../MessagesList';
import { GameMessage } from '../../../../../shared/types';

describe('MessagesList', () => {
  const mockMessages: GameMessage[] = [
    {
      role: 'user',
      content: 'Is it an animal?',
      message_type: 'question',
    },
    {
      role: 'assistant',
      content: 'Yes, it is an animal.',
      message_type: 'answer',
    },
    {
      role: 'user',
      content: 'Is it a mammal?',
      message_type: 'question',
    },
    {
      role: 'assistant',
      content: 'No, it is not a mammal.',
      message_type: 'answer',
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
    const { UNSAFE_getByType } = render(<MessagesList {...defaultProps} sending={true} />);
    const { ActivityIndicator } = require('react-native');
    
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('does not show loading indicator when not sending', () => {
    const { queryByRole } = render(<MessagesList {...defaultProps} sending={false} />);
    
    expect(queryByRole('progressbar')).toBeNull();
  });

  it('renders hint messages correctly', () => {
    const hintMessages: GameMessage[] = [
      {
        role: 'assistant',
        content: 'Here is a hint: It flies in the sky.',
        message_type: 'hint',
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
        role: 'user',
        content: 'Hello!',
        message_type: 'question',
      },
    ];
    
    const { getByText } = render(<MessagesList messages={singleMessage} sending={false} />);
    
    expect(getByText('Hello!')).toBeTruthy();
  });
});