import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { CreemProvider } from '../src/CreemProvider';
import { CreemCheckoutButton } from '../src/CreemCheckoutButton';
import type { CreemConfig } from '../src/types';

const CONFIG: CreemConfig = { apiUrl: 'http://test-api', authToken: 'tok_test', scheme: 'testapp' };
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CreemProvider config={CONFIG}>{children}</CreemProvider>
);

const mockFetch = jest.fn();
beforeEach(() => { global.fetch = mockFetch; mockFetch.mockReset(); });

describe('CreemCheckoutButton', () => {
  it('renders with title', () => {
    const { getByText } = render(
      <CreemCheckoutButton productId="prod_1" title="Buy Now" />,
      { wrapper },
    );
    expect(getByText('Buy Now')).toBeTruthy();
  });

  it('renders default title', () => {
    const { getByText } = render(
      <CreemCheckoutButton productId="prod_1" />,
      { wrapper },
    );
    expect(getByText('Subscribe')).toBeTruthy();
  });

  it('calls checkout on press', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'cs_1', checkoutUrl: 'https://checkout.creem.io/cs_1' }),
    });

    const onSuccess = jest.fn();
    const { getByText } = render(
      <CreemCheckoutButton productId="prod_1" onSuccess={onSuccess} />,
      { wrapper },
    );

    fireEvent.press(getByText('Subscribe'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api/checkout',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('disables when disabled prop is true', () => {
    const { getByText } = render(
      <CreemCheckoutButton productId="prod_1" disabled />,
      { wrapper },
    );
    const button = getByText('Subscribe');
    expect(button).toBeTruthy();
  });
});
