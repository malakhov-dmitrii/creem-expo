import { Router } from 'express';
import { Creem } from 'creem';


export function serializeLicense(lic: any) {
  return {
    id: lic.id,
    status: lic.status,
    key: lic.key,
    activation: lic.activation,
    activationLimit: lic.activationLimit ?? null,
    expiresAt: lic.expiresAt?.toISOString?.() ?? lic.expiresAt ?? null,
    createdAt: lic.createdAt?.toISOString?.() ?? lic.createdAt,
    instance: lic.instance
      ? {
          id: lic.instance.id,
          name: lic.instance.name,
          status: lic.instance.status,
          createdAt: lic.instance.createdAt?.toISOString?.() ?? lic.instance.createdAt,
        }
      : null,
  };
}

export function createLicenseRouter(creem: InstanceType<typeof Creem>): Router {
  const router = Router();

  router.post('/activate', async (req, res) => {
    const { key, instanceName } = req.body ?? {};
    if (!key || !instanceName) {
      res.status(400).json({ error: 'key and instanceName are required' });
      return;
    }
    try {
      const lic = await creem.licenses.activate({ key, instanceName });
      res.json(serializeLicense(lic));
    } catch { res.status(500).json({ error: 'Failed to activate license' }); }
  });

  router.post('/validate', async (req, res) => {
    const { key, instanceId } = req.body ?? {};
    if (!key || !instanceId) {
      res.status(400).json({ error: 'key and instanceId are required' });
      return;
    }
    try {
      const lic = await creem.licenses.validate({ key, instanceId });
      res.json(serializeLicense(lic));
    } catch { res.status(500).json({ error: 'Failed to validate license' }); }
  });

  router.post('/deactivate', async (req, res) => {
    const { key, instanceId } = req.body ?? {};
    if (!key || !instanceId) {
      res.status(400).json({ error: 'key and instanceId are required' });
      return;
    }
    try {
      const lic = await creem.licenses.deactivate({ key, instanceId });
      res.json(serializeLicense(lic));
    } catch { res.status(500).json({ error: 'Failed to deactivate license' }); }
  });

  return router;
}
