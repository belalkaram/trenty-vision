import jwt from 'jsonwebtoken';
import { db } from '../../database/client';
import { users, roles, rolePermissions, permissions, employees, companies } from '../../database/schema/index';
import { PasswordService } from '../../services/password.service';
import { config } from '../../config/index';
import {
  UnauthorizedError,
  ValidationError,
  ConflictError,
  NotFoundError,
} from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { generateRandomToken } from '../../utils/crypto';
import { eq } from 'drizzle-orm';
import {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from './auth.schema';
import { logger } from '../../utils/logger';

export interface TokenPayload {
  userId: string;
  email: string;
  roleId: string | null;
  rememberMe?: boolean;
}

export class AuthService {
  /**
   * Generate access and refresh tokens (supports 365-day rememberMe retention)
   */
  public static generateTokens(
    user: { id: string; email: string; roleId?: string | null },
    rememberMe = true
  ) {
    const isRemembered = rememberMe !== false;
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId || null,
      rememberMe: isRemembered,
    };

    const expiresIn = isRemembered ? '365d' : (config.JWT_ACCESS_EXPIRES_IN || '30d');
    const refreshExpiresIn = isRemembered ? '365d' : (config.JWT_REFRESH_EXPIRES_IN || '365d');

    const accessToken = jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: expiresIn as any,
    });

    const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: refreshExpiresIn as any,
    });

    return { accessToken, refreshToken, expiresIn, rememberMe: isRemembered };
  }

  /**
   * User login with email & password
   */
  public static async login(
    input: LoginInput,
    context?: { ip?: string; userAgent?: string }
  ) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email.toLowerCase()),
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is inactive or suspended');
    }

    const isValid = await PasswordService.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Trial Period Check
    let remainingTrialDays: number | null = null;
    if (user.trialEndsAt) {
      const now = new Date();
      if (now > user.trialEndsAt) {
        throw new UnauthorizedError('تم حذفك من النظام لانتهاء الفترة التجريبية');
      }
      const diffMs = user.trialEndsAt.getTime() - now.getTime();
      remainingTrialDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    // Update lastLoginAt
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    let companyInfo: { id: string; name: string; slug: string | null; logoUrl: string | null; status: string; type: string } | null = null;
    if (user.companyId) {
      const comp = await db.query.companies.findFirst({
        where: eq(companies.id, user.companyId),
      });
      if (comp) {
        if (comp.status === 'suspended') {
          throw new UnauthorizedError('تم إيقاف حساب الشركة. يرجى التواصل مع الإدارة.');
        }
        companyInfo = {
          id: comp.id,
          name: comp.name,
          slug: comp.slug,
          logoUrl: comp.logoUrl,
          status: comp.status,
          type: comp.type,
        };
      }
    }

    // Fetch role and permissions
    let userRole = null;
    let assignedPerms: { name: string }[] = [];

    if (user.roleId) {
      userRole = await db.query.roles.findFirst({
        where: eq(roles.id, user.roleId),
      });

      assignedPerms = await db
        .select({ name: permissions.name })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, user.roleId));
    }

    const tokens = this.generateTokens(user, input.rememberMe ?? true);

    // Audit log
    await AuditService.log({
      actorId: user.id,
      companyId: user.companyId || undefined,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      metadata: { email: user.email },
    });

    const isSuperAdmin = user.companyId === null;

    return {
      user: {
        id: user.id,
        companyId: user.companyId,
        company: companyInfo,
        isSuperAdmin,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: userRole?.name || (isSuperAdmin ? 'superadmin' : 'unknown'),
        roleDisplayName: userRole?.displayName || (isSuperAdmin ? 'Super Admin' : 'Unknown'),
        permissions: isSuperAdmin ? ['*'] : assignedPerms.map((p) => p.name),
        remainingTrialDays,
      },
      tokens,
    };
  }

  /**
   * User registration (by default assigns 'employee' role if not specified)
   */
  public static async register(
    input: RegisterInput,
    context?: { ip?: string; userAgent?: string }
  ) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, input.email.toLowerCase()),
    });

    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    let roleId = input.roleId;
    if (!roleId) {
      const defaultRole = await db.query.roles.findFirst({
        where: eq(roles.name, 'employee'),
      });
      if (!defaultRole) {
        throw new Error('Default role not found in system');
      }
      roleId = defaultRole.id;
    }

    const passwordHash = await PasswordService.hash(input.password);
    const emailToken = generateRandomToken(16);

    const [newUser] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        roleId,
        emailToken,
        emailVerified: false,
        status: 'active',
      })
      .returning();

    const userRole = newUser.roleId ? await db.query.roles.findFirst({
      where: eq(roles.id, newUser.roleId),
    }) : null;

    const assignedPerms = newUser.roleId ? await db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, newUser.roleId)) : [];

    const tokens = this.generateTokens(newUser);

    // Audit log
    await AuditService.log({
      actorId: newUser.id,
      action: 'auth.register',
      entityType: 'user',
      entityId: newUser.id,
      ipAddress: context?.ip,
      userAgent: context?.userAgent,
      metadata: { email: newUser.email },
    });

    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: userRole?.name || 'employee',
        roleDisplayName: userRole?.displayName || 'Employee',
        permissions: assignedPerms.map((p) => p.name),
      },
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  public static async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as TokenPayload;

      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.userId),
      });

      if (!user || user.status !== 'active') {
        throw new UnauthorizedError('User is no longer active');
      }

      return this.generateTokens(user, decoded.rememberMe ?? true);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Initiate forgot password flow
   */
  public static async forgotPassword(input: ForgotPasswordInput) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email.toLowerCase()),
    });

    // Always respond with success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    const resetToken = generateRandomToken(32);
    const resetExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await db
      .update(users)
      .set({ resetToken, resetExpires })
      .where(eq(users.id, user.id));

    // In dev / initial phase, log the reset token to console/logger
    logger.info(
      { email: user.email, resetToken, resetUrl: `${config.APP_URL}/reset-password?token=${resetToken}` },
      'Password reset requested'
    );

    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  /**
   * Reset password using reset token
   */
  public static async resetPassword(input: ResetPasswordInput) {
    const user = await db.query.users.findFirst({
      where: eq(users.resetToken, input.token),
    });

    if (!user || !user.resetExpires || user.resetExpires < new Date()) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const passwordHash = await PasswordService.hash(input.password);

    await db
      .update(users)
      .set({
        passwordHash,
        resetToken: null,
        resetExpires: null,
      })
      .where(eq(users.id, user.id));

    await AuditService.log({
      actorId: user.id,
      action: 'auth.reset_password',
      entityType: 'user',
      entityId: user.id,
    });

    return { message: 'Password has been reset successfully. You may now log in.' };
  }

  /**
   * Change password for logged-in user
   */
  public static async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const matches = await PasswordService.compare(input.currentPassword, user.passwordHash);
    if (!matches) {
      throw new ValidationError('Incorrect current password');
    }

    const passwordHash = await PasswordService.hash(input.newPassword);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

    await AuditService.log({
      actorId: user.id,
      action: 'auth.change_password',
      entityType: 'user',
      entityId: user.id,
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Get current user profile with role and permissions
   */
  public static async getMe(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    let companyInfo: { id: string; name: string; slug: string | null; logoUrl: string | null; status: string; type: string } | null = null;
    if (user.companyId) {
      const comp = await db.query.companies.findFirst({
        where: eq(companies.id, user.companyId),
      });
      if (comp) {
        companyInfo = {
          id: comp.id,
          name: comp.name,
          slug: comp.slug,
          logoUrl: comp.logoUrl,
          status: comp.status,
          type: comp.type,
        };
      }
    }

    let userRole = null;
    let assignedPerms: { name: string }[] = [];

    if (user.roleId) {
      userRole = await db.query.roles.findFirst({
        where: eq(roles.id, user.roleId),
      });

      assignedPerms = await db
        .select({ name: permissions.name })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, user.roleId));
    }

    const [employee] = await db
      .select({ id: employees.id, stationId: employees.stationId })
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    const isSuperAdmin = user.companyId === null;

    return {
      id: user.id,
      companyId: user.companyId,
      company: companyInfo,
      isSuperAdmin,
      employeeId: employee?.id || null,
      stationId: employee?.stationId || null,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: userRole?.name || (isSuperAdmin ? 'superadmin' : 'unknown'),
      roleDisplayName: userRole?.displayName || (isSuperAdmin ? 'Super Admin' : 'Unknown'),
      permissions: isSuperAdmin ? ['*'] : assignedPerms.map((p) => p.name),
      createdAt: user.createdAt,
    };
  }
}
