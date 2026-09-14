import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../../database/client';
import { whatsappSessions, whatsappAuthKeys } from '../../database/schema/index';
import { config } from '../../config/index';
import { logger } from '../../utils/logger';
import type { AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys';
import { proto, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';

const AUTH_KEY_PREFIX = 'auth_key';

/**
 * AES-256-GCM Encryption/Decryption helpers.
 * Every value stored in PostgreSQL is encrypted at rest.
 */
function getEncryptionKey(): Buffer {
  return Buffer.from(config.ENCRYPTION_KEY, 'hex');
}

function encrypt(data: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedString: string): string {
  const parts = encryptedString.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format');
  const [ivHex, authTagHex, encryptedData] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Serializes Baileys BufferJSON-compatible objects to encrypted strings.
 */
function serializeValue(value: any): string {
  const json = JSON.stringify(value, BufferJSON.replacer);
  return encrypt(json);
}

function deserializeValue(encryptedStr: string): any {
  const json = decrypt(encryptedStr);
  return JSON.parse(json, BufferJSON.reviver);
}

/**
 * Creates a PostgreSQL-backed AuthenticationState for Baileys.
 * All credentials and keys are encrypted with AES-256-GCM before storage.
 */
export async function usePostgresAuthState(accountId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearState: () => Promise<void>;
}> {
  // Load or initialize creds
  let creds: AuthenticationState['creds'];

  const existingSession = await db
    .select()
    .from(whatsappSessions)
    .where(eq(whatsappSessions.accountId, accountId))
    .limit(1);

  if (existingSession.length > 0 && existingSession[0].encryptedAuthState) {
    try {
      creds = deserializeValue(existingSession[0].encryptedAuthState);
      // Validate that noiseKey and signedIdentityKey private/public keys are actual Buffers
      if (!creds?.noiseKey || !Buffer.isBuffer(creds?.noiseKey?.private) || !Buffer.isBuffer(creds?.noiseKey?.public)) {
        throw new Error('Invalid or corrupted noiseKey in creds (expected real Buffer)');
      }
      logger.debug({ accountId }, 'Loaded existing Baileys credentials from PostgreSQL');
    } catch (err) {
      logger.warn({ accountId, err }, 'Failed to decrypt or validate existing credentials, reinitializing clean creds');
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
    logger.info({ accountId }, 'Initialized new Baileys credentials');
  }

  // Ensure session record exists
  if (existingSession.length === 0) {
    await db.insert(whatsappSessions).values({
      accountId,
      encryptedAuthState: serializeValue(creds),
    });
  }

  const saveCreds = async () => {
    const encrypted = serializeValue(creds);
    await db
      .update(whatsappSessions)
      .set({
        encryptedAuthState: encrypted,
        updatedAt: new Date(),
      })
      .where(eq(whatsappSessions.accountId, accountId));
    logger.debug({ accountId }, 'Saved Baileys credentials to PostgreSQL');
  };

  const clearState = async () => {
    await db
      .delete(whatsappAuthKeys)
      .where(eq(whatsappAuthKeys.accountId, accountId));
    await db
      .update(whatsappSessions)
      .set({
        encryptedAuthState: null,
        qrCode: null,
        updatedAt: new Date(),
      })
      .where(eq(whatsappSessions.accountId, accountId));
    logger.info({ accountId }, 'Cleared Baileys auth state from PostgreSQL');
  };

  const keys = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
      const result: { [id: string]: SignalDataTypeMap[T] } = {};

      if (ids.length === 0) return result;

      for (const id of ids) {
        const rows = await db
          .select()
          .from(whatsappAuthKeys)
          .where(
            and(
              eq(whatsappAuthKeys.accountId, accountId),
              eq(whatsappAuthKeys.keyType, type),
              eq(whatsappAuthKeys.keyId, id)
            )
          )
          .limit(1);

        if (rows.length > 0) {
          try {
            let value = deserializeValue(rows[0].valueEncrypted);
            // Handle proto deserialization for app state sync keys
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            result[id] = value;
          } catch (err) {
            logger.warn({ accountId, keyType: type, keyId: id, err }, 'Failed to decrypt auth key');
          }
        }
      }

      return result;
    },

    set: async (data: { [T in keyof SignalDataTypeMap]?: { [id: string]: SignalDataTypeMap[T] | null } }) => {
      for (const [type, entries] of Object.entries(data)) {
        if (!entries) continue;
        for (const [id, value] of Object.entries(entries)) {
          if (value === null || value === undefined) {
            // Delete key
            await db
              .delete(whatsappAuthKeys)
              .where(
                and(
                  eq(whatsappAuthKeys.accountId, accountId),
                  eq(whatsappAuthKeys.keyType, type),
                  eq(whatsappAuthKeys.keyId, id)
                )
              );
          } else {
            // Upsert key
            const encrypted = serializeValue(value);
            const existing = await db
              .select()
              .from(whatsappAuthKeys)
              .where(
                and(
                  eq(whatsappAuthKeys.accountId, accountId),
                  eq(whatsappAuthKeys.keyType, type),
                  eq(whatsappAuthKeys.keyId, id)
                )
              )
              .limit(1);

            if (existing.length > 0) {
              await db
                .update(whatsappAuthKeys)
                .set({
                  valueEncrypted: encrypted,
                  updatedAt: new Date(),
                })
                .where(eq(whatsappAuthKeys.id, existing[0].id));
            } else {
              await db.insert(whatsappAuthKeys).values({
                accountId,
                keyType: type,
                keyId: id,
                valueEncrypted: encrypted,
              });
            }
          }
        }
      }
    },
  };

  return {
    state: { creds, keys },
    saveCreds,
    clearState,
  };
}
