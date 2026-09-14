import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/api-response';
import { config } from '../../config/index';

function setAuthCookies(reply: FastifyReply, tokens: { accessToken: string; refreshToken: string }) {
  const isProd = config.NODE_ENV === 'production';

  // Access token cookie (15 mins)
  reply.setCookie('access_token', tokens.accessToken, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 15 * 60, // 15 mins in seconds
  });

  // Refresh token cookie (7 days)
  reply.setCookie('refresh_token', tokens.refreshToken, {
    path: '/api/v1/auth/refresh',
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('access_token', { path: '/' });
  reply.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
}

export async function authRoutes(fastify: FastifyInstance) {
  // POST /login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = loginSchema.parse(request.body);
    const result = await AuthService.login(input, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    setAuthCookies(reply, result.tokens);
    return sendSuccess(reply, { user: result.user, tokens: result.tokens }, 'Login successful');
  });

  // POST /register
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = registerSchema.parse(request.body);
    const result = await AuthService.register(input, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    setAuthCookies(reply, result.tokens);
    return sendSuccess(reply, { user: result.user, tokens: result.tokens }, 'Registration successful', 201);
  });

  // POST /refresh
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    let token = request.cookies?.refresh_token;
    if (!token && request.body && typeof request.body === 'object' && 'refreshToken' in request.body) {
      token = (request.body as any).refreshToken;
    }

    if (!token) {
      return reply.status(401).send({
        success: false,
        data: null,
        message: 'Refresh token missing',
        errors: null,
        meta: { requestId: request.id },
      });
    }

    const tokens = await AuthService.refresh(token);
    setAuthCookies(reply, tokens);
    return sendSuccess(reply, { tokens }, 'Token refreshed');
  });

  // POST /logout
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    clearAuthCookies(reply);
    return sendSuccess(reply, null, 'Logged out successfully');
  });

  // POST /forgot-password
  fastify.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = forgotPasswordSchema.parse(request.body);
    const result = await AuthService.forgotPassword(input);
    return sendSuccess(reply, result, result.message);
  });

  // POST /reset-password
  fastify.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const input = resetPasswordSchema.parse(request.body);
    const result = await AuthService.resetPassword(input);
    return sendSuccess(reply, result, result.message);
  });

  // GET /me
  fastify.get('/me', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const me = await AuthService.getMe(request.user!.id);
    return sendSuccess(reply, me, 'Current user profile');
  });

  // POST /change-password
  fastify.post(
    '/change-password',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Restrict password change strictly to Manager / Admin / Administrator
      const role = request.user?.roleName;
      if (role !== 'adminstrator' && role !== 'super_admin' && role !== 'admin') {
        return reply.status(403).send({
          success: false,
          data: null,
          message: 'صلاحية تغيير كلمة المرور مقتصرة على المدير فقط',
          errors: null,
          meta: { requestId: request.id },
        });
      }

      const input = changePasswordSchema.parse(request.body);
      const result = await AuthService.changePassword(request.user!.id, input);
      return sendSuccess(reply, result, result.message);
    }
  );
}
