import { db } from '../../database/client';
import * as schema from '../../database/schema/index';
import { PasswordService } from '../../services/password.service';
import { logger } from '../../utils/logger';
import { eq, and } from 'drizzle-orm';
import { ConflictError } from '../../utils/errors';

export const COMPANY_DEFAULT_PERMISSIONS = [
  // Chats & Messages
  { name: 'view_chats', displayName: 'View Conversations', groupName: 'inbox', description: 'Can view conversations' },
  { name: 'send_messages', displayName: 'Send Messages', groupName: 'inbox', description: 'Can send WhatsApp text messages' },
  { name: 'send_media', displayName: 'Send Media', groupName: 'inbox', description: 'Can send photos, videos, voice notes, documents' },

  // Organization & Staff
  { name: 'manage_employees', displayName: 'Manage Employees', groupName: 'organization', description: 'Can create, edit and manage employees' },
  { name: 'manage_roles', displayName: 'Manage Roles', groupName: 'organization', description: 'Can manage roles and permissions' },
  { name: 'manage_stations', displayName: 'Manage Stations', groupName: 'organization', description: 'Can create and manage stations' },
  { name: 'manage_assignments', displayName: 'Manage Assignments', groupName: 'organization', description: 'Can assign and reassign conversations/leads' },
  { name: 'manage_company', displayName: 'Manage Company Profile', groupName: 'organization', description: 'Can manage company profile & settings' },

  // WhatsApp & Gateway
  { name: 'manage_whatsapp', displayName: 'Manage WhatsApp Accounts', groupName: 'whatsapp', description: 'Can connect, disconnect, QR scan WhatsApp' },

  // Automation & Rules
  { name: 'manage_automation', displayName: 'Manage Automation', groupName: 'automation', description: 'Can configure rules, bot and triggers' },
  { name: 'manage_quick_replies', displayName: 'Manage Quick Replies', groupName: 'automation', description: 'Can manage canned quick replies' },

  // Leads & Contacts
  { name: 'manage_leads', displayName: 'Manage Leads', groupName: 'leads', description: 'Can view, edit, and advance lead stages' },
  { name: 'manage_contacts', displayName: 'Manage Contacts', groupName: 'contacts', description: 'Can manage customer contacts and details' },

  // Reminders
  { name: 'manage_reminders', displayName: 'Manage Reminders', groupName: 'reminders', description: 'Can create, complete, snooze reminders' },

  // CRM
  { name: 'manage_crm', displayName: 'Manage CRM Integrations', groupName: 'crm', description: 'Can configure CRM connections and view sync' },

  // Reports & Audits
  { name: 'view_reports', displayName: 'View Analytics & Reports', groupName: 'reports', description: 'Can view metrics and export reports' },
  { name: 'view_audit_logs', displayName: 'View Audit Logs', groupName: 'security', description: 'Can inspect system audit trail' },
  { name: 'export_data', displayName: 'Export System Data', groupName: 'security', description: 'Can export CSV and data backups' },

  // Settings & Notifications
  { name: 'manage_settings', displayName: 'Manage System Settings', groupName: 'settings', description: 'Can change operational parameters' },
  { name: 'manage_tags', displayName: 'Manage Tags', groupName: 'settings', description: 'Can manage conversation tags' },
  { name: 'manage_notifications', displayName: 'Manage Notifications', groupName: 'settings', description: 'Can manage notification preferences' },
];

export interface ProvisionCompanyInput {
  name: string;
  slug?: string;
  logoUrl?: string;
  type?: 'crm' | 'group_manager';
  status?: 'active' | 'suspended' | 'inactive';
  subscriptionPlan?: string;
  maxUsers?: number;
  timezone?: string;
  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
}

export class CompanyProvisioningService {
  static async provisionCompany(input: ProvisionCompanyInput) {
    const slug =
      input.slug ||
      input.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') ||
      `company-${Date.now()}`;

    // Check slug uniqueness
    const existingCompany = await db.query.companies.findFirst({
      where: eq(schema.companies.slug, slug),
    });

    if (existingCompany) {
      throw new ConflictError(`Company slug '${slug}' is already taken.`);
    }

    // 1. Create Company
    const [company] = await db
      .insert(schema.companies)
      .values({
        name: input.name.trim(),
        slug,
        logoUrl: input.logoUrl || null,
        type: input.type || 'crm',
        status: input.status || 'active',
        subscriptionPlan: input.subscriptionPlan || 'standard',
        maxUsers: input.maxUsers || 10,
        timezone: input.timezone || 'Asia/Kuwait',
        settings: {
          branding: {
            name: input.name.trim(),
            logoUrl: input.logoUrl || null,
          },
        },
      })
      .returning();

    logger.info({ companyId: company.id, name: company.name }, 'Provisioning new company...');

    // 2. Clone/Create isolated Permissions for this company
    const permissionMap = new Map<string, string>();
    for (const perm of COMPANY_DEFAULT_PERMISSIONS) {
      const [inserted] = await db
        .insert(schema.permissions)
        .values({
          companyId: company.id,
          name: perm.name,
          displayName: perm.displayName,
          groupName: perm.groupName,
          description: perm.description,
        })
        .returning();
      permissionMap.set(perm.name, inserted.id);
    }

    // 3. Create isolated Roles for this company
    const ROLES_CONFIG = [
      {
        name: 'adminstrator',
        displayName: 'Administrator (المدير)',
        description: 'صلاحيات الإدارة والتحكم الكامل بالمنظومة للشركة',
        isSystem: true,
        permissions: Array.from(permissionMap.keys()),
      },
      {
        name: 'employer',
        displayName: 'Employer (الموظف)',
        description: 'فريق العمل وممثلو خدمة العملاء والمحادثات',
        isSystem: true,
        permissions: [
          'view_chats',
          'send_messages',
          'send_media',
          'manage_reminders',
          'manage_leads',
          'manage_contacts',
          'manage_quick_replies',
          'manage_tags',
        ],
      },
    ];

    const roleMap = new Map<string, string>();
    for (const roleData of ROLES_CONFIG) {
      const [role] = await db
        .insert(schema.roles)
        .values({
          companyId: company.id,
          name: roleData.name,
          displayName: roleData.displayName,
          description: roleData.description,
          isSystem: roleData.isSystem,
        })
        .returning();

      roleMap.set(roleData.name, role.id);

      // Link role permissions
      for (const permName of roleData.permissions) {
        const permId = permissionMap.get(permName);
        if (permId) {
          await db
            .insert(schema.rolePermissions)
            .values({
              roleId: role.id,
              permissionId: permId,
            })
            .onConflictDoNothing();
        }
      }
    }

    // 4. Default Settings for this company
    await db
      .insert(schema.settings)
      .values([
        {
          companyId: company.id,
          key: 'general_settings',
          value: {
            companyName: company.name,
            timezone: company.timezone,
            logoUrl: company.logoUrl,
          },
          groupName: 'general',
          description: 'General company settings',
        },
        {
          companyId: company.id,
          key: 'notification_settings',
          value: {
            emailNotifications: true,
            soundEnabled: true,
          },
          groupName: 'notifications',
          description: 'Notification preferences',
        },
      ])
      .onConflictDoNothing();

    // 5. Create initial Admin User if credentials provided
    let adminUser = null;
    if (input.adminEmail && input.adminPassword) {
      const passwordHash = await PasswordService.hash(input.adminPassword);
      const adminRoleId = roleMap.get('adminstrator');

      const [newUser] = await db
        .insert(schema.users)
        .values({
          companyId: company.id,
          name: input.adminName || `${company.name} Admin`,
          email: input.adminEmail.trim().toLowerCase(),
          passwordHash,
          roleId: adminRoleId,
          status: 'active',
          emailVerified: true,
        })
        .returning();

      adminUser = newUser;
    }

    logger.info({ companyId: company.id }, 'Company provisioning completed successfully.');

    return {
      company,
      roles: Array.from(roleMap.entries()).map(([name, id]) => ({ name, id })),
      adminUser: adminUser
        ? {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
          }
        : null,
    };
  }
}
