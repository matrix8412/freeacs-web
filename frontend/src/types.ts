export type Group = {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  system: boolean;
};

export type User = {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'disabled';
  groups: Array<{ id: string; name: string; permissions: string[] }>;
  permissions: string[];
  lastLoginAt?: string;
};

export type Device = {
  id: string;
  serialNumber?: string;
  manufacturer?: string;
  productClass?: string;
  oui?: string;
  softwareVersion?: string;
  ipAddress?: string;
  lastInform?: string;
  firstAuthorizedAt?: string;
  online: boolean;
  tags: string[];
  raw?: Record<string, unknown>;
};

export type DeviceType = {
  _id: string;
  name: string;
  imageDataUrl: string;
};

export type Provision = {
  name: string;
  script: string;
};

export type Preset = {
  name: string;
  channel: string;
  weight: number;
  events: Record<string, boolean>;
  precondition: string;
  provision: string;
  arguments: unknown[];
  raw?: Record<string, unknown>;
};
