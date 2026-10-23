// Stub for @whiskeysockets/baileys in Vercel Serverless environment
// Since WhatsApp sockets cannot and should not run in ephemeral serverless lambdas,
// all Baileys socket connections are handled by the WhatsApp Bridge running locally or on VPS.

export function makeWASocket() {
  throw new Error('Baileys WASocket is not supported in Vercel serverless environment. All WhatsApp connections run via the WhatsApp Bridge.');
}

export default makeWASocket;

export const DisconnectReason = {
  loggedOut: 401,
  timedOut: 408,
  connectionClosed: 428,
  connectionLost: 408,
  connectionReplaced: 440,
  badSession: 500,
  restartRequired: 515,
  multicastTimeout: 504,
};

export async function useMultiFileAuthState(_sessionDir: string) {
  return {
    state: { creds: {} as any, keys: {} as any },
    saveCreds: async () => {},
  };
}

export async function fetchLatestBaileysVersion() {
  return { version: [2, 3000, 1015901307] as [number, number, number], isLatest: true };
}

export function makeCacheableSignalKeyStore(keys: any, _logger?: any) {
  return keys;
}

export function makeInMemoryStore() {
  return {
    bind: () => {},
    writeToFile: () => {},
    readFromFile: () => {},
  };
}

export const Browsers = {
  ubuntu: (browser: string) => ['Ubuntu', browser, '20.0.04'] as [string, string, string],
  macOS: (browser: string) => ['Mac OS', browser, '14.0.0'] as [string, string, string],
  windows: (browser: string) => ['Windows', browser, '10.0.0'] as [string, string, string],
  appropriate: (browser: string) => ['Desktop', browser, '1.0.0'] as [string, string, string],
};

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jidNormalizedUser(jid?: string) {
  if (!jid) return '';
  return jid.replace(/:[0-9]+@/, '@');
}

export function isLidUser(jid?: string) {
  if (!jid) return false;
  return jid.endsWith('@lid');
}

export const proto = {} as any;
export function initAuthCreds() { return {} as any; }
export const BufferJSON = { replacer: () => {}, reviver: () => {} };

export type WASocket = any;
export type BaileysEventMap = any;
export type ConnectionState = any;
export type AuthenticationState = any;
export type SignalDataTypeMap = any;
