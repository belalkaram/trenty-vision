import { db, pool } from './client';
import * as schema from './schema/index';
import { PasswordService } from '../services/password.service';
import { logger } from '../utils/logger';
import { eq } from 'drizzle-orm';

const DEFAULT_PERMISSIONS = [
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

export async function seedDatabase() {
  logger.info('Seeding database...');

  try {
    // 1. Company
    let company = await db.query.companies.findFirst({
      where: eq(schema.companies.name, 'Trenty Vision'),
    });

    if (!company) {
      // Check if old Kenooz company exists and rename it
      const oldCompany = await db.query.companies.findFirst({
        where: eq(schema.companies.name, 'Kenooz'),
      });

      if (oldCompany) {
        const [updated] = await db
          .update(schema.companies)
          .set({ name: 'Trenty Vision' })
          .where(eq(schema.companies.id, oldCompany.id))
          .returning();
        company = updated;
        logger.info({ companyId: company.id }, 'Company renamed from Kenooz to Trenty Vision');
      } else {
        const [inserted] = await db
          .insert(schema.companies)
          .values({
            name: 'Trenty Vision',
            timezone: 'Asia/Kuwait',
            settings: {
              country: 'KW',
              currency: 'KWD',
            },
          })
          .returning();
        company = inserted;
        logger.info({ companyId: company.id }, 'Company "Trenty Vision" created');
      }
    }

    // 2. Permissions
    const permissionMap = new Map<string, string>();
    for (const perm of DEFAULT_PERMISSIONS) {
      const existing = await db.query.permissions.findFirst({
        where: eq(schema.permissions.name, perm.name),
      });

      if (!existing) {
        const [inserted] = await db.insert(schema.permissions).values(perm).returning();
        permissionMap.set(perm.name, inserted.id);
      } else {
        permissionMap.set(perm.name, existing.id);
      }
    }
    logger.info(`Seeded ${permissionMap.size} permissions`);

    // 3. Roles — Strictly Administrator (المدير) and Employer (الموظف)
    const ROLES_CONFIG = [
      {
        name: 'adminstrator',
        displayName: 'Administrator (المدير)',
        description: 'صلاحيات الإدارة والتحكم الكامل بالمنظومة',
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
      let role = await db.query.roles.findFirst({
        where: eq(schema.roles.name, roleData.name),
      });

      if (!role) {
        const [inserted] = await db
          .insert(schema.roles)
          .values({
            name: roleData.name,
            displayName: roleData.displayName,
            description: roleData.description,
            isSystem: roleData.isSystem,
          })
          .returning();
        role = inserted;
      } else {
        await db
          .update(schema.roles)
          .set({ displayName: roleData.displayName, description: roleData.description })
          .where(eq(schema.roles.id, role.id));
      }

      roleMap.set(roleData.name, role.id);

      // Assign permissions
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

    const adminstratorRoleId = roleMap.get('adminstrator')!;
    const employerRoleId = roleMap.get('employer')!;

    // Reassign any existing users with old roles to the 2 official roles
    const allRoles = await db.select().from(schema.roles);
    for (const oldRole of allRoles) {
      if (oldRole.name === 'adminstrator' || oldRole.name === 'employer') continue;
      const targetRoleId = (oldRole.name === 'super_admin' || oldRole.name === 'admin') ? adminstratorRoleId : employerRoleId;
      await db.update(schema.users).set({ roleId: targetRoleId }).where(eq(schema.users.roleId, oldRole.id));
      // Delete old role permissions and role
      await db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, oldRole.id));
      await db.delete(schema.roles).where(eq(schema.roles.id, oldRole.id));
    }
    logger.info('Roles strictly configured to adminstrator and employer');

    // 4. Default Super Admin User (admin@trenty.com)
    const adminEmail = 'admin@trenty.com';
    let adminUser = await db.query.users.findFirst({
      where: eq(schema.users.email, adminEmail),
    });

    if (!adminUser) {
      // Check for legacy emails to update
      const legacyAdmin = await db.query.users.findFirst({
        where: eq(schema.users.email, 'admin@kenooz.com'),
      });

      if (legacyAdmin) {
        const [updated] = await db
          .update(schema.users)
          .set({
            email: adminEmail,
            name: 'مدير النظام — Trenty Vision',
            roleId: adminstratorRoleId,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, legacyAdmin.id))
          .returning();
        adminUser = updated;
        logger.info({ email: adminEmail }, 'Migrated legacy admin user to admin@trenty.com');
      } else {
        const passwordHash = await PasswordService.hash('Password123!');
        const [inserted] = await db
          .insert(schema.users)
          .values({
            name: 'مدير النظام — Trenty Vision',
            email: adminEmail,
            passwordHash,
            roleId: adminstratorRoleId,
            emailVerified: true,
            status: 'active',
          })
          .returning();
        adminUser = inserted;
        logger.info({ email: adminEmail }, 'Created default adminstrator user (admin@trenty.com)');
      }
    } else {
      await db
        .update(schema.users)
        .set({ roleId: adminstratorRoleId })
        .where(eq(schema.users.id, adminUser.id));
    }

    // 5. Clean up Departments and unassign all dependencies
    await db.update(schema.employees).set({ departmentId: null });
    await db.update(schema.stations).set({ departmentId: null });
    await db.delete(schema.departments);
    logger.info('Departments cleaned up and disassociated');

    // 6. Default Stations (no department dependency)
    const defaultStationNames = ['محطة الاستشارات الطبية', 'محطة المنتجات الصحية', 'محطة المتابعة والرعاية'];
    for (const stationName of defaultStationNames) {
      const existingStation = await db.query.stations.findFirst({
        where: eq(schema.stations.name, stationName),
      });
      if (!existingStation) {
        await db.insert(schema.stations).values({
          companyId: company.id,
          departmentId: null,
          name: stationName,
          description: `محطة العمل: ${stationName}`,
          active: true,
        });
      }
    }
    logger.info('Seeded stations (independent of departments)');

    // 7. Initial Settings
    const defaultSettings = [
      { key: 'automation_enabled', value: true, groupName: 'automation', description: 'Enable or disable rule-based bots' },
      { key: 'auto_reply_enabled', value: true, groupName: 'automation', description: 'Enable automatic replies' },
      { key: 'assignment_enabled', value: true, groupName: 'assignment', description: 'Enable automatic lead/chat assignment' },
      { key: 'assignment_mode', value: 'round_robin', groupName: 'assignment', description: 'Strategy: round_robin, least_busy, manual' },
      { key: 'reminders_enabled', value: true, groupName: 'reminders', description: 'Enable reminder notifications' },
      { key: 'crm_sync_enabled', value: true, groupName: 'crm', description: 'Enable external CRM sync' },
      {
        key: 'business_hours',
        value: {
          enabled: true,
          timezone: 'Asia/Kuwait',
          start: '09:00',
          end: '18:00',
          workDays: [0, 1, 2, 3, 4, 6],
        },
        groupName: 'operational',
        description: 'Business operating hours and quiet hours',
      },
      {
        key: 'welcome_message_enabled',
        value: true,
        groupName: 'automation',
        description: 'Send automatic welcome message to new contacts',
      },
      {
        key: 'welcome_message_template',
        value: 'مرحباً بك في ترينتي فيجن (Trenty Vision) للخدمات والرعاية الصحية! يسعدنا تواصلك معنا، سيقوم أحد أخصائيي الرعاية بالرد عليك ومساعدتك في أقرب وقت.',
        groupName: 'automation',
        description: 'Template for automatic welcome message',
      },
      {
        key: 'out_of_hours_message_enabled',
        value: false,
        groupName: 'automation',
        description: 'Send automatic response outside working hours',
      },
      {
        key: 'out_of_hours_message_template',
        value: 'شكراً لتواصلك مع ترينتي فيجن (Trenty Vision) للرعاية الصحية! نحن حالياً خارج أوقات العمل الرسمية. سنقوم بالرد عليك وتقديم الرعاية المطلوبة فور بدء ساعات العمل القادمة.',
        groupName: 'automation',
        description: 'Template for out of hours automatic reply',
      },
    ];

    for (const setting of defaultSettings) {
      await db
        .insert(schema.settings)
        .values(setting)
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: {
            value: setting.value,
            description: setting.description,
          },
        });
    }
    logger.info('Default system settings seeded and updated');

    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error({ error }, 'Error during database seeding');
    throw error;
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}
