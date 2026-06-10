// Web Bluetooth helper for printing to cheap 58mm BLE thermal printers.
//
// IMPORTANT platform notes:
//   • Web Bluetooth works on Chrome/Edge (Android + desktop) over HTTPS.
//   • It does NOT work on iOS — Safari and Chrome-for-iOS both lack the API.
//   • It only speaks BLE (GATT), not Bluetooth Classic / SPP. Printers that
//     are Classic-only will not be connectable from any browser.
//
// We declare the minimal slice of the Web Bluetooth interface we use here so
// the project doesn't need the @types/web-bluetooth dependency.

interface BTCharacteristic {
  properties: { write: boolean; writeWithoutResponse: boolean }
  writeValue(data: BufferSource): Promise<void>
  writeValueWithoutResponse(data: BufferSource): Promise<void>
}
interface BTService {
  getCharacteristics(): Promise<BTCharacteristic[]>
}
interface BTServer {
  connected: boolean
  connect(): Promise<BTServer>
  disconnect(): void
  getPrimaryServices(): Promise<BTService[]>
}
interface BTDevice {
  name?: string
  gatt?: BTServer
}
interface BTRequestOptions {
  acceptAllDevices?: boolean
  optionalServices?: string[]
}
interface Bluetooth {
  requestDevice(options: BTRequestOptions): Promise<BTDevice>
}

function getBluetooth(): Bluetooth | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as unknown as { bluetooth?: Bluetooth }).bluetooth
}

export function isBluetoothPrintingSupported(): boolean {
  return !!getBluetooth()
}

// Service UUIDs commonly exposed by generic 58mm BLE thermal printers. We list
// them as optionalServices so the browser will let us read them after the user
// picks a device; the actual writable characteristic is then auto-discovered.
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
]

export interface PrinterConnection {
  device: BTDevice
  characteristic: BTCharacteristic
}

export function isConnected(conn: PrinterConnection | null): boolean {
  return !!conn?.device.gatt?.connected
}

// Opens the OS device chooser, connects, and finds the first writable
// characteristic. Must be called from within a user gesture (e.g. a click).
export async function connectPrinter(): Promise<PrinterConnection> {
  const bluetooth = getBluetooth()
  if (!bluetooth) throw new Error('unsupported')

  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICES,
  })

  const gatt = device.gatt
  if (!gatt) throw new Error('no-gatt')
  const server = await gatt.connect()

  const services = await server.getPrimaryServices()
  for (const svc of services) {
    const chars = await svc.getCharacteristics()
    for (const ch of chars) {
      if (ch.properties.write || ch.properties.writeWithoutResponse) {
        return { device, characteristic: ch }
      }
    }
  }
  throw new Error('no-writable-characteristic')
}

// BLE writes are capped (often ~180–512 bytes), so the receipt is streamed in
// small chunks with a brief pause between them to avoid overrunning the buffer.
export async function printBytes(conn: PrinterConnection, bytes: Uint8Array): Promise<void> {
  const CHUNK = 180
  const noResponse = conn.characteristic.properties.writeWithoutResponse
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.slice(i, i + CHUNK)
    if (noResponse) await conn.characteristic.writeValueWithoutResponse(slice)
    else            await conn.characteristic.writeValue(slice)
    await new Promise((r) => setTimeout(r, 20))
  }
}
