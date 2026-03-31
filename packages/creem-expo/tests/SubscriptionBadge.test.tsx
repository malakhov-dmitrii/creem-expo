import { render } from '@testing-library/react-native';
import React from 'react';
import { SubscriptionBadge } from '../src/SubscriptionBadge';

describe('SubscriptionBadge', () => {
  it('renders Active for active status', () => {
    const { getByText } = render(<SubscriptionBadge status="active" />);
    expect(getByText('Active')).toBeTruthy();
  });

  it('renders Trial for trialing status', () => {
    const { getByText } = render(<SubscriptionBadge status="trialing" />);
    expect(getByText('Trial')).toBeTruthy();
  });

  it('renders Paused for paused status', () => {
    const { getByText } = render(<SubscriptionBadge status="paused" />);
    expect(getByText('Paused')).toBeTruthy();
  });

  it('renders Canceled for canceled status', () => {
    const { getByText } = render(<SubscriptionBadge status="canceled" />);
    expect(getByText('Canceled')).toBeTruthy();
  });

  it('renders Canceling for scheduled_cancel', () => {
    const { getByText } = render(<SubscriptionBadge status="scheduled_cancel" />);
    expect(getByText('Canceling')).toBeTruthy();
  });

  it('renders nothing for null status', () => {
    const { toJSON } = render(<SubscriptionBadge status={null} />);
    expect(toJSON()).toBeNull();
  });

  it('accepts size prop', () => {
    const { getByText } = render(<SubscriptionBadge status="active" size="large" />);
    expect(getByText('Active')).toBeTruthy();
  });
});
