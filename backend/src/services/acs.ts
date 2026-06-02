import axios, { AxiosError } from 'axios';
import { config } from '../config/env.js';
import { DeviceAuthorization } from '../models/DeviceAuthorization.js';
import { HttpError } from '../utils/http.js';

type ListDevicesFilter = {
  search?: string;
  status?: 'all' | 'online' | 'offline';
  tag?: string;
  limit?: number;
};

type DeviceTaskRequest = {
  action: 'refresh' | 'reboot' | 'factoryReset' | 'setParameterValues';
  connectionRequest?: boolean;
  parameterPath?: string;
  parameterValue?: string | number | boolean;
  parameterType?: string;
};

type ProvisionInput = {
  name: string;
  script: string;
};

type PresetInput = {
  name: string;
  channel: string;
  weight: number;
  events: Record<string, boolean>;
  precondition: string;
  provision: string;
  arguments: unknown[];
};

const acsClient = axios.create({
  baseURL: config.ACS_NBI_URL,
  timeout: 8000
});

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function valueAt(document: any, path: string) {
  return path.split('.').reduce((value, part) => value?.[part], document);
}

function parameterValue(document: any, path: string) {
  const value = valueAt(document, path);
  return value?._value ?? value;
}

function normalizeDevice(device: any) {
  const lastInform = device._lastInform ? new Date(device._lastInform) : undefined;
  const online = lastInform ? Date.now() - lastInform.getTime() < 15 * 60 * 1000 : false;
  const tags = device.Tags ? Object.keys(device.Tags).filter((key) => device.Tags[key]) : [];

  return {
    id: device._id,
    serialNumber: device._deviceId?._SerialNumber || parameterValue(device, 'Device.DeviceInfo.SerialNumber') || parameterValue(device, 'InternetGatewayDevice.DeviceInfo.SerialNumber'),
    manufacturer: device._deviceId?._Manufacturer || parameterValue(device, 'Device.DeviceInfo.Manufacturer') || parameterValue(device, 'InternetGatewayDevice.DeviceInfo.Manufacturer'),
    productClass: device._deviceId?._ProductClass || parameterValue(device, 'Device.DeviceInfo.ProductClass') || parameterValue(device, 'InternetGatewayDevice.DeviceInfo.ProductClass'),
    oui: device._deviceId?._OUI,
    softwareVersion: parameterValue(device, 'Device.DeviceInfo.SoftwareVersion') || parameterValue(device, 'InternetGatewayDevice.DeviceInfo.SoftwareVersion'),
    ipAddress: device._remoteAddress || parameterValue(device, 'Device.IP.Interface.1.IPv4Address.1.IPAddress'),
    lastInform: device._lastInform,
    firstAuthorizedAt: undefined as string | undefined,
    online,
    tags,
    raw: device
  };
}

function isDuplicateKeyError(error: unknown) {
  const candidate = error as { code?: number; writeErrors?: Array<{ code?: number }> };

  if (candidate.code === 11000) return true;
  return Boolean(candidate.writeErrors?.length && candidate.writeErrors.every((writeError) => writeError.code === 11000));
}

async function attachFirstAuthorizedAt<T extends { id: string; firstAuthorizedAt?: string }>(devices: T[]) {
  if (!devices.length) return devices;

  const now = new Date();
  const deviceIds = Array.from(new Set(devices.map((device) => device.id).filter(Boolean)));

  if (!deviceIds.length) return devices;

  try {
    await DeviceAuthorization.bulkWrite(
      deviceIds.map((deviceId) => ({
        updateOne: {
          filter: { deviceId },
          update: {
            $setOnInsert: {
              deviceId,
              firstAuthorizedAt: now
            }
          },
          upsert: true
        }
      })),
      { ordered: false }
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
  }

  const authorizations = await DeviceAuthorization.find({ deviceId: { $in: deviceIds } }).lean();
  const authorizationByDeviceId = new Map(authorizations.map((authorization) => [authorization.deviceId, authorization.firstAuthorizedAt?.toISOString()]));

  return devices.map((device) => ({
    ...device,
    firstAuthorizedAt: authorizationByDeviceId.get(device.id)
  }));
}

function normalizeProvision(provision: any) {
  return {
    name: provision._id,
    script: provision.script || ''
  };
}

function normalizePreset(preset: any) {
  const provisionConfig = Array.isArray(preset.configurations) ? preset.configurations.find((configuration: any) => configuration?.type === 'provision') : undefined;

  return {
    name: preset._id,
    channel: preset.channel || 'default',
    weight: Number(preset.weight || 0),
    events: preset.events || {},
    precondition: preset.precondition || '{}',
    provision: provisionConfig?.name || '',
    arguments: provisionConfig?.args || [],
    raw: preset
  };
}

function buildDeviceQuery(filter: ListDevicesFilter) {
  const clauses: Record<string, unknown>[] = [];

  if (filter.search) {
    const term = escapeRegex(filter.search.trim());
    clauses.push({
      $or: [
        { _id: { $regex: term, $options: 'i' } },
        { '_deviceId._SerialNumber': { $regex: term, $options: 'i' } },
        { '_deviceId._Manufacturer': { $regex: term, $options: 'i' } },
        { '_deviceId._ProductClass': { $regex: term, $options: 'i' } }
      ]
    });
  }

  if (filter.tag) {
    clauses.push({ [`Tags.${filter.tag}`]: true });
  }

  if (filter.status && filter.status !== 'all') {
    const threshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    clauses.push(filter.status === 'online' ? { _lastInform: { $gt: threshold } } : { $or: [{ _lastInform: { $lte: threshold } }, { _lastInform: { $exists: false } }] });
  }

  if (!clauses.length) return {};
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

function toTaskBody(task: DeviceTaskRequest) {
  if (task.action === 'refresh') {
    return { name: 'refreshObject', objectName: '' };
  }

  if (task.action === 'reboot') {
    return { name: 'reboot' };
  }

  if (task.action === 'factoryReset') {
    return { name: 'factoryReset' };
  }

  if (!task.parameterPath || task.parameterValue === undefined) {
    throw new HttpError(400, 'Parameter path and value are required');
  }

  return {
    name: 'setParameterValues',
    parameterValues: [[task.parameterPath, task.parameterValue, task.parameterType || 'xsd:string']]
  };
}

function mapAcsError(error: unknown) {
  if (error instanceof HttpError) return error;

  if (error instanceof AxiosError) {
    const status = error.response?.status || 502;
    const message = typeof error.response?.data === 'string' ? error.response.data : 'ACS request failed';
    return new HttpError(status >= 500 ? 502 : status, message, error.response?.data);
  }

  return new HttpError(502, 'ACS request failed');
}

export const acsService = {
  async health() {
    try {
      await acsClient.get('/devices/', { params: { query: '{}', limit: 1 } });
      return { ok: true, nbiUrl: config.ACS_NBI_URL, cwmpPublicUrl: config.ACS_CWMP_PUBLIC_URL };
    } catch (error) {
      throw mapAcsError(error);
    }
  },

  async listDevices(filter: ListDevicesFilter = {}) {
    try {
      const query = buildDeviceQuery(filter);
      const response = await acsClient.get('/devices/', {
        params: {
          query: JSON.stringify(query),
          limit: Math.min(filter.limit || 100, 500)
        }
      });

      const devices = Array.isArray(response.data) ? response.data.map(normalizeDevice) : [];
      return attachFirstAuthorizedAt(devices);
    } catch (error) {
      throw mapAcsError(error);
    }
  },

  async getDevice(id: string) {
    try {
      const response = await acsClient.get(`/devices/${encodeURIComponent(id)}`);
      const [device] = await attachFirstAuthorizedAt([normalizeDevice(response.data)]);
      return device;
    } catch (error) {
      throw mapAcsError(error);
    }
  },

  async createTask(id: string, task: DeviceTaskRequest) {
    try {
      const response = await acsClient.post(`/devices/${encodeURIComponent(id)}/tasks`, toTaskBody(task), {
        params: task.connectionRequest ? { connection_request: true } : undefined
      });

      return response.data;
    } catch (error) {
      throw mapAcsError(error);
    }
  },

  async listProvisions() {
    try {
      const response = await acsClient.get('/provisions/');
      return Array.isArray(response.data) ? response.data.map(normalizeProvision).sort((a, b) => a.name.localeCompare(b.name)) : [];
    } catch (error) {
      throw mapAcsError(error);
    }
  },

  async upsertProvision(input: ProvisionInput, previousName?: string) {
    try {
      await acsClient.put(`/provisions/${encodeURIComponent(input.name)}`, input.script, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });

      if (previousName && previousName !== input.name) {
        await acsClient.delete(`/provisions/${encodeURIComponent(previousName)}`);
      }

      return this.listProvisions();
    } catch (error) {
      throw mapAcsError(error);
    }
  },

  async deleteProvision(name: string) {
    try {
      await acsClient.delete(`/provisions/${encodeURIComponent(name)}`);
      return this.listProvisions();
    } catch (error) {
      throw mapAcsError(error);
    }
  },

  async listPresets() {
    try {
      const response = await acsClient.get('/presets/', {
        params: { query: '{}' }
      });

      return Array.isArray(response.data) ? response.data.map(normalizePreset).sort((a, b) => a.name.localeCompare(b.name)) : [];
    } catch (error) {
      throw mapAcsError(error);
    }
  },

  async upsertPreset(input: PresetInput, previousName?: string) {
    try {
      await acsClient.put(
        `/presets/${encodeURIComponent(input.name)}`,
        {
          channel: input.channel,
          weight: input.weight,
          events: input.events,
          precondition: input.precondition,
          configurations: [
            {
              type: 'provision',
              name: input.provision,
              args: input.arguments
            }
          ]
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (previousName && previousName !== input.name) {
        await acsClient.delete(`/presets/${encodeURIComponent(previousName)}`);
      }

      return this.listPresets();
    } catch (error) {
      throw mapAcsError(error);
    }
  },

  async deletePreset(name: string) {
    try {
      await acsClient.delete(`/presets/${encodeURIComponent(name)}`);
      return this.listPresets();
    } catch (error) {
      throw mapAcsError(error);
    }
  }
};
