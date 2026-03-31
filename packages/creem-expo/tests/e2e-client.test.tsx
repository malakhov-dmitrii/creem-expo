/**
 * Client-side E2E integration test.
 *
 * Renders a realistic Expo app tree with CreemProvider and exercises
 * every hook + component through a simulated user journey:
 *
 *   1. useCreemProducts — search and display products
 *   2. CreemCheckoutButton — start a checkout
 *   3. useSubscription — fetch active subscription
 *   4. SubscriptionGate — gate premium content
 *   5. SubscriptionBadge + SubscriptionStatusCard — display status
 *   6. useCreemLicense — activate, validate, deactivate
 *   7. useCreemCustomerPortal — open billing portal
 *   8. useEntitlements — offline-cached entitlement check
 *   9. Utility functions — formatPrice, isSubscriptionActive, etc.
 */
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { CreemProvider } from '../src/CreemProvider';
import { useCreemProducts } from '../src/useCreemProducts';
import { useCreemCheckout } from '../src/useCreemCheckout';
import { useSubscription } from '../src/useSubscription';
import { useCreemLicense } from '../src/useCreemLicense';
import { useCreemCustomerPortal } from '../src/useCreemCustomerPortal';
import { useEntitlements } from '../src/useEntitlements';
import { SubscriptionGate } from '../src/SubscriptionGate';
import { SubscriptionBadge } from '../src/SubscriptionBadge';
import { SubscriptionStatusCard } from '../src/SubscriptionStatusCard';
import { CreemCheckoutButton } from '../src/CreemCheckoutButton';
import {
  formatPrice, formatDate, formatBillingPeriod,
  isSubscriptionActive, getSubscriptionStatusLabel,
} from '../src/utils';
import type { CreemConfig, SubscriptionData } from '../src/types';

// ─── Setup ─────────────────────────────────────────────────────────────
const CONFIG: CreemConfig = { apiUrl: 'http://localhost:3001/api', authToken: 'tok_e2e', scheme: 'testapp' };
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CreemProvider config={CONFIG}>{children}</CreemProvider>
);

const mockFetch = jest.fn();
beforeEach(async () => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
  // Clear AsyncStorage mock between tests to prevent cache leaks
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.clear();
});

// ─── Fixtures ──────────────────────────────────────────────────────────
const PRODUCTS_RESPONSE = {
  items: [
    { id: 'prod_starter', name: 'Starter', price: 900, currency: 'USD', billingType: 'recurring', billingPeriod: 'every-month', status: 'active' },
    { id: 'prod_pro', name: 'Pro', price: 2900, currency: 'USD', billingType: 'recurring', billingPeriod: 'every-month', status: 'active' },
  ],
  pagination: { totalRecords: 2, totalPages: 1, currentPage: 1, nextPage: null, prevPage: null },
};

const ACTIVE_SUB: SubscriptionData = {
  id: 'sub_xyz', status: 'active', productId: 'prod_pro', customerId: 'cust_1',
  currentPeriodStartDate: '2026-03-01T00:00:00Z',
  currentPeriodEndDate: '2026-04-01T00:00:00Z',
  canceledAt: null,
  createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-15T00:00:00Z',
};

const LICENSE_RESPONSE = {
  id: 'lic_1', status: 'active', key: 'LIC-PRO-001',
  activation: 1, activationLimit: 5, expiresAt: '2027-03-01T00:00:00Z',
  createdAt: '2026-03-01T00:00:00Z',
  instance: { id: 'inst_1', name: 'macbook', status: 'active', createdAt: '2026-03-01T00:00:00Z' },
};

const PORTAL_RESPONSE = { portalUrl: 'https://billing.creem.io/portal/cust_1' };

// ─── Helper to mock sequential fetches ─────────────────────────────────
function mockOk(body: any) {
  return { ok: true, json: () => Promise.resolve(body) };
}
function mockError(status: number) {
  return { ok: false, status, json: () => Promise.resolve({ error: 'fail' }) };
}

// ─── E2E Tests ─────────────────────────────────────────────────────────
describe('Client E2E: full Expo user journey', () => {

  // ── 1. Products ──────────────────────────────────────────────────────
  it('Step 1: useCreemProducts searches and paginates', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(PRODUCTS_RESPONSE));

    function ProductList() {
      const { products, pagination, search, loading } = useCreemProducts();
      useEffect(() => { search(1, 10); }, []);
      if (loading) return <Text>Loading...</Text>;
      return (
        <View>
          {products.map((p) => <Text key={p.id}>{p.name}: {formatPrice(p.price, p.currency)}</Text>)}
          <Text>Total: {pagination?.totalRecords}</Text>
        </View>
      );
    }

    const { getByText } = render(<ProductList />, { wrapper });

    await waitFor(() => {
      expect(getByText('Starter: $9.00')).toBeTruthy();
      expect(getByText('Pro: $29.00')).toBeTruthy();
      expect(getByText('Total: 2')).toBeTruthy();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/products?pageNumber=1&pageSize=10',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok_e2e' }) }),
    );
  });

  // ── 2. Checkout Button ───────────────────────────────────────────────
  it('Step 2: CreemCheckoutButton triggers checkout flow', async () => {
    mockFetch.mockResolvedValueOnce(mockOk({
      id: 'cs_abc', checkoutUrl: 'https://checkout.creem.io/cs_abc',
    }));

    const { getByText } = render(
      <CreemCheckoutButton productId="prod_pro" title="Get Pro" />,
      { wrapper },
    );

    expect(getByText('Get Pro')).toBeTruthy();
    fireEvent.press(getByText('Get Pro'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/checkout',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  // ── 3. Subscription + Gate ───────────────────────────────────────────
  it('Step 3: useSubscription + SubscriptionGate grants access', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(ACTIVE_SUB));

    const { getByText, queryByText } = render(
      <SubscriptionGate subscriptionId="sub_xyz">
        <Text>Premium Content</Text>
      </SubscriptionGate>,
      { wrapper },
    );

    await waitFor(() => {
      expect(getByText('Premium Content')).toBeTruthy();
      expect(queryByText('Subscribe to access')).toBeNull();
    });
  });

  it('Step 3b: SubscriptionGate blocks when canceled', async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ ...ACTIVE_SUB, status: 'canceled' }));

    const { getByText } = render(
      <SubscriptionGate subscriptionId="sub_xyz" fallback={<Text>Please upgrade</Text>}>
        <Text>Premium Content</Text>
      </SubscriptionGate>,
      { wrapper },
    );

    await waitFor(() => {
      expect(getByText('Please upgrade')).toBeTruthy();
    });
  });

  // ── 4. Subscription display ──────────────────────────────────────────
  it('Step 4: SubscriptionStatusCard and SubscriptionBadge render correctly', () => {
    const { getAllByText } = render(
      <View>
        <SubscriptionStatusCard subscription={ACTIVE_SUB} />
        <SubscriptionBadge status={ACTIVE_SUB.status} size="medium" />
      </View>,
    );

    // Both StatusCard and Badge render "Active"
    const actives = getAllByText('Active');
    expect(actives.length).toBeGreaterThanOrEqual(2);
  });

  // ── 5. License management ────────────────────────────────────────────
  it('Step 5: useCreemLicense activate → validate → deactivate', async () => {
    mockFetch
      .mockResolvedValueOnce(mockOk(LICENSE_RESPONSE))
      .mockResolvedValueOnce(mockOk(LICENSE_RESPONSE))
      .mockResolvedValueOnce(mockOk({ ...LICENSE_RESPONSE, status: 'inactive', instance: null }));

    function LicenseFlow() {
      const { license, activate, validate, deactivate, loading } = useCreemLicense();
      const [step, setStep] = useState(0);

      useEffect(() => {
        (async () => {
          await activate({ key: 'LIC-PRO-001', instanceName: 'macbook' });
          setStep(1);
          await validate({ key: 'LIC-PRO-001', instanceId: 'inst_1' });
          setStep(2);
          await deactivate({ key: 'LIC-PRO-001', instanceId: 'inst_1' });
          setStep(3);
        })();
      }, []);

      return (
        <View>
          <Text>Step: {step}</Text>
          <Text>Status: {license?.status ?? 'none'}</Text>
        </View>
      );
    }

    const { getByText } = render(<LicenseFlow />, { wrapper });

    await waitFor(() => {
      expect(getByText('Step: 3')).toBeTruthy();
      expect(getByText('Status: inactive')).toBeTruthy();
    });

    // Verify all 3 calls were made
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenNthCalledWith(1,
      'http://localhost:3001/api/license/activate',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ key: 'LIC-PRO-001', instanceName: 'macbook' }) }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(2,
      'http://localhost:3001/api/license/validate',
      expect.objectContaining({ body: JSON.stringify({ key: 'LIC-PRO-001', instanceId: 'inst_1' }) }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(3,
      'http://localhost:3001/api/license/deactivate',
      expect.objectContaining({ body: JSON.stringify({ key: 'LIC-PRO-001', instanceId: 'inst_1' }) }),
    );
  });

  // ── 6. Customer portal ───────────────────────────────────────────────
  it('Step 6: useCreemCustomerPortal generates portal link', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(PORTAL_RESPONSE));

    function PortalButton() {
      const { portalUrl, generatePortalLink, loading } = useCreemCustomerPortal();
      return (
        <View>
          <Text onPress={() => generatePortalLink('cust_1')}>Open Portal</Text>
          {portalUrl && <Text>URL: {portalUrl}</Text>}
        </View>
      );
    }

    const { getByText } = render(<PortalButton />, { wrapper });

    await act(async () => {
      fireEvent.press(getByText('Open Portal'));
    });

    await waitFor(() => {
      expect(getByText('URL: https://billing.creem.io/portal/cust_1')).toBeTruthy();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/portal',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ customerId: 'cust_1' }),
      }),
    );
  });

  // ── 7. Entitlements ──────────────────────────────────────────────────
  it('Step 7: useEntitlements provides isActive from subscription', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(ACTIVE_SUB));

    function EntitlementCheck() {
      const { entitlement, isActive, loading } = useEntitlements('sub_xyz');
      if (loading) return <Text>Checking...</Text>;
      return (
        <View>
          <Text>Active: {isActive ? 'yes' : 'no'}</Text>
          <Text>Product: {entitlement?.productId ?? 'none'}</Text>
        </View>
      );
    }

    const { getByText } = render(<EntitlementCheck />, { wrapper });

    await waitFor(() => {
      expect(getByText('Active: yes')).toBeTruthy();
      expect(getByText('Product: prod_pro')).toBeTruthy();
    });
  });

  it('Step 7b: useEntitlements reports inactive for canceled sub', async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ ...ACTIVE_SUB, status: 'canceled' }));

    function EntitlementCheck() {
      const { isActive, loading } = useEntitlements('sub_xyz');
      if (loading) return <Text>Checking...</Text>;
      return <Text>Active: {isActive ? 'yes' : 'no'}</Text>;
    }

    const { getByText } = render(<EntitlementCheck />, { wrapper });

    await waitFor(() => {
      expect(getByText('Active: no')).toBeTruthy();
    });
  });

  // ── 8. Utility functions ─────────────────────────────────────────────
  it('Step 8: utility functions work correctly', () => {
    expect(formatPrice(2900, 'USD')).toBe('$29.00');
    expect(formatPrice(999, 'EUR')).toBe('€9.99');
    expect(formatDate('2026-03-31T00:00:00Z')).toContain('Mar');
    expect(formatBillingPeriod('every-month')).toBe('Monthly');
    expect(formatBillingPeriod('every-year')).toBe('Yearly');
    expect(isSubscriptionActive(ACTIVE_SUB)).toBe(true);
    expect(isSubscriptionActive({ ...ACTIVE_SUB, status: 'canceled' })).toBe(false);
    expect(isSubscriptionActive(null)).toBe(false);
    expect(getSubscriptionStatusLabel('active')).toBe('Active');
    expect(getSubscriptionStatusLabel('scheduled_cancel')).toBe('Canceling');
  });

  // ── 9. Error handling ────────────────────────────────────────────────
  it('Step 9: hooks handle server errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce(mockError(500));

    function ErrorTest() {
      const { products, error, search, loading } = useCreemProducts();
      useEffect(() => { search(); }, []);
      if (loading) return <Text>Loading...</Text>;
      if (error) return <Text>Error: {error.message}</Text>;
      return <Text>Count: {products.length}</Text>;
    }

    const { getByText } = render(<ErrorTest />, { wrapper });

    await waitFor(() => {
      expect(getByText(/Error:/)).toBeTruthy();
    });
  });

  it('Step 9b: useSubscription handles fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network offline'));

    function SubErrorTest() {
      const { error, loading } = useSubscription('sub_xyz');
      if (loading) return <Text>Loading...</Text>;
      if (error) return <Text>SubError: {error.message}</Text>;
      return <Text>OK</Text>;
    }

    const { getByText } = render(<SubErrorTest />, { wrapper });

    await waitFor(() => {
      expect(getByText('SubError: Network offline')).toBeTruthy();
    });
  });
});
