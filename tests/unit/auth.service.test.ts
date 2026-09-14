import { describe, it, expect } from 'vitest';
import { AuthService } from '../../src/modules/auth/auth.service';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config/index';

describe('AuthService Token Operations', () => {
  it('should generate valid access and refresh JWTs', () => {
    const mockUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test@kenooz.com',
      roleId: '00000000-0000-0000-0000-000000000002',
    };

    const tokens = AuthService.generateTokens(mockUser);

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    const decodedAccess = jwt.verify(tokens.accessToken, config.JWT_ACCESS_SECRET) as any;
    expect(decodedAccess.userId).toBe(mockUser.id);
    expect(decodedAccess.email).toBe(mockUser.email);

    const decodedRefresh = jwt.verify(tokens.refreshToken, config.JWT_REFRESH_SECRET) as any;
    expect(decodedRefresh.userId).toBe(mockUser.id);
  });
});
