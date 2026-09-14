import { describe, it, expect, beforeEach } from 'vitest';
import { MockWhatsAppProvider } from '../../src/providers/whatsapp/whatsapp.provider';

describe('MockWhatsAppProvider', () => {
  let provider: MockWhatsAppProvider;
  const accountId = 'acc_test_123';

  beforeEach(() => {
    provider = new MockWhatsAppProvider();
  });

  it('should initialize in disconnected state', async () => {
    const status = await provider.getStatus(accountId);
    expect(status.status).toBe('disconnected');
    expect(status.phoneNumber).toBeUndefined();
  });

  it('should transition to connected on connect', async () => {
    await provider.connect(accountId);
    const status = await provider.getStatus(accountId);
    expect(status.status).toBe('connected');
    expect(status.phoneNumber).toBe('+96512345678');
    expect(status.jid).toBe('96512345678@s.whatsapp.net');
  });

  it('should return mock QR code', async () => {
    const qr = await provider.getQRCode(accountId);
    expect(qr).toBe('mock_qr_string_data');
  });

  it('should send text message', async () => {
    const result = await provider.sendText('96512345678@s.whatsapp.net', 'Hello Trenty Vision');
    expect(result).toBeDefined();
    expect(result.id).toMatch(/^mock_msg_/);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should send media message (image)', async () => {
    const fakeBuffer = Buffer.from('fake image content');
    const result = await provider.sendImage('96512345678@s.whatsapp.net', fakeBuffer, 'image/jpeg');

    expect(result).toBeDefined();
    expect(result.id).toMatch(/^mock_img_/);
  });

  it('should disconnect cleanly', async () => {
    await provider.connect(accountId);
    await provider.disconnect(accountId);
    const status = await provider.getStatus(accountId);
    expect(status.status).toBe('disconnected');
  });

  it('should logout cleanly', async () => {
    await provider.connect(accountId);
    await provider.logout(accountId);
    const status = await provider.getStatus(accountId);
    expect(status.status).toBe('logged_out');
  });
});
