import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScreenState } from '../ScreenState';

describe('ScreenState', () => {
  it('renders the empty state title, message, and icon', () => {
    render(
      <ScreenState
        type="empty"
        title="No goals yet"
        message="Create your first goal to get started."
      />
    );

    expect(screen.getByText('No goals yet')).toBeTruthy();
    expect(screen.getByText('Create your first goal to get started.')).toBeTruthy();
    expect(screen.getByTestId('material-community-icon').props.children).toBe('clipboard-text-outline');
  });

  it('renders the error state and calls onRetry when Retry is pressed', () => {
    const onRetry = jest.fn();

    render(
      <ScreenState
        type="error"
        title="Could not load goals"
        message="Please try again."
        onRetry={onRetry}
        retryLabel="Retry"
      />
    );

    expect(screen.getByText('Could not load goals')).toBeTruthy();
    expect(screen.getByText('Please try again.')).toBeTruthy();
    expect(screen.getByTestId('material-community-icon').props.children).toBe('alert-circle-outline');

    fireEvent.press(screen.getByText('Retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render a retry button when onRetry is not provided', () => {
    render(
      <ScreenState
        type="error"
        title="Something went wrong"
        message="No retry available."
      />
    );

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('Try Again')).toBeNull();
  });

  it('renders without a message when message prop is omitted', () => {
    render(<ScreenState type="empty" title="Nothing here" />);

    expect(screen.getByText('Nothing here')).toBeTruthy();
  });
});
