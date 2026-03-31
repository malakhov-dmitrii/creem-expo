import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createLicenseRouter, serializeLicense } from '../../src/server/license';

const mockActivate = vi.fn();
const mockValidate = vi.fn();
const mockDeactivate = vi.fn();
const mockCreem = {
  licenses: { activate: mockActivate, validate: mockValidate, deactivate: mockDeactivate },
} as any;

const MOCK_LICENSE = {
  id: 'lic_1', status: 'active', key: 'KEY-123',
  activation: 1, activationLimit: 3,
  expiresAt: new Date('2027-01-01T00:00:00Z'),
  createdAt: new Date('2026-03-01T00:00:00Z'),
  instance: {
    id: 'inst_1', name: 'my-laptop', status: 'active',
    createdAt: new Date('2026-03-01T00:00:00Z'),
  },
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/license', createLicenseRouter(mockCreem));
  return app;
}

beforeEach(() => { mockActivate.mockReset(); mockValidate.mockReset(); mockDeactivate.mockReset(); });

describe('serializeLicense', () => {
  it('serializes dates to ISO strings', () => {
    const result = serializeLicense(MOCK_LICENSE);
    expect(result.expiresAt).toBe('2027-01-01T00:00:00.000Z');
    expect(result.createdAt).toBe('2026-03-01T00:00:00.000Z');
    expect(result.instance?.createdAt).toBe('2026-03-01T00:00:00.000Z');
  });

  it('handles null instance', () => {
    const result = serializeLicense({ ...MOCK_LICENSE, instance: null });
    expect(result.instance).toBeNull();
  });
});

describe('POST /license/activate', () => {
  it('activates a license', async () => {
    mockActivate.mockResolvedValueOnce(MOCK_LICENSE);
    const res = await request(buildApp())
      .post('/license/activate')
      .send({ key: 'KEY-123', instanceName: 'my-laptop' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('lic_1');
    expect(mockActivate).toHaveBeenCalledWith({ key: 'KEY-123', instanceName: 'my-laptop' });
  });

  it('returns 400 when key is missing', async () => {
    const res = await request(buildApp())
      .post('/license/activate')
      .send({ instanceName: 'my-laptop' });
    expect(res.status).toBe(400);
  });

  it('returns 500 on SDK error', async () => {
    mockActivate.mockRejectedValueOnce(new Error('fail'));
    const res = await request(buildApp())
      .post('/license/activate')
      .send({ key: 'KEY-123', instanceName: 'my-laptop' });
    expect(res.status).toBe(500);
  });
});

describe('POST /license/validate', () => {
  it('validates a license', async () => {
    mockValidate.mockResolvedValueOnce(MOCK_LICENSE);
    const res = await request(buildApp())
      .post('/license/validate')
      .send({ key: 'KEY-123', instanceId: 'inst_1' });
    expect(res.status).toBe(200);
    expect(mockValidate).toHaveBeenCalledWith({ key: 'KEY-123', instanceId: 'inst_1' });
  });

  it('returns 400 when instanceId is missing', async () => {
    const res = await request(buildApp())
      .post('/license/validate')
      .send({ key: 'KEY-123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /license/deactivate', () => {
  it('deactivates a license', async () => {
    mockDeactivate.mockResolvedValueOnce(MOCK_LICENSE);
    const res = await request(buildApp())
      .post('/license/deactivate')
      .send({ key: 'KEY-123', instanceId: 'inst_1' });
    expect(res.status).toBe(200);
    expect(mockDeactivate).toHaveBeenCalledWith({ key: 'KEY-123', instanceId: 'inst_1' });
  });
});
