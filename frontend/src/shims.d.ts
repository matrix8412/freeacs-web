import 'vue';

type BluetoothDevice = unknown;
type BluetoothLEScanFilter = Record<string, unknown>;
type BluetoothRemoteGATTServer = unknown;
type BluetoothServiceUUID = string | number;

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [element: string]: unknown;
  }
}

declare module 'vue' {
  export interface GlobalComponents {
    [component: string]: any;
  }
}
