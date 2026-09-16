import { db, pool } from './client';
import * as schema from './schema/index';
import { PasswordService } from '../services/password.service';
import { CompanyProvisioningService } from '../modules/superadmin/company-provisioning.service';
import { logger } from '../utils/logger';
import { eq, isNull } from 'drizzle-orm';

export async function seedDatabase() {
  logger.info('Seeding database for Multi-Tenant Architecture...');

  try {
    // 1. Global Super Admin (Outside any company: company_id = null)
    const superAdminEmail = 'superadmin@crm.com';
    let superAdmin = await db.query.users.findFirst({
      where: eq(schema.users.email, superAdminEmail),
    });

    if (!superAdmin) {
      const passwordHash = await PasswordService.hash('SuperAdmin123!');
      const [createdSuperAdmin] = await db
        .insert(schema.users)
        .values({
          name: 'Global Super Admin',
          email: superAdminEmail,
          passwordHash,
          companyId: null, // Global level: outside all companies
          roleId: null,
          emailVerified: true,
          status: 'active',
        })
        .returning();
      superAdmin = createdSuperAdmin;
      logger.info({ email: superAdminEmail }, 'Global Super Admin created successfully');
    } else {
      await db
        .update(schema.users)
        .set({
          companyId: null,
          roleId: null,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, superAdmin.id));
      logger.info({ email: superAdminEmail }, 'Global Super Admin updated to global scope (company_id = null)');
    }

    // 2. Provision or update default Company: Trenty Vision
    let company = await db.query.companies.findFirst({
      where: eq(schema.companies.slug, 'trenty-vision'),
    });

    if (!company) {
      // Check by name if slug was not set
      company = await db.query.companies.findFirst({
        where: eq(schema.companies.name, 'Trenty Vision'),
      });
    }

    if (!company) {
      // Check legacy Kenooz
      const legacy = await db.query.companies.findFirst({
        where: eq(schema.companies.name, 'Kenooz'),
      });

      if (legacy) {
        const [updated] = await db
          .update(schema.companies)
          .set({
            name: 'Trenty Vision',
            slug: 'trenty-vision',
            status: 'active',
            subscriptionPlan: 'enterprise',
            maxUsers: 25,
            timezone: 'Asia/Kuwait',
            settings: {
              branding: {
                name: 'Trenty Vision',
                logoUrl: null,
              },
            },
          })
          .where(eq(schema.companies.id, legacy.id))
          .returning();
        company = updated;
      }
    }

    if (!company) {
      // Clean provisioning via CompanyProvisioningService
      const result = await CompanyProvisioningService.provisionCompany({
        name: 'Trenty Vision',
        slug: 'trenty-vision',
        status: 'active',
        subscriptionPlan: 'enterprise',
        maxUsers: 25,
        timezone: 'Asia/Kuwait',
        adminName: 'مدير شركة Trenty Vision',
        adminEmail: 'admin@trenty.com',
        adminPassword: 'Password123!',
      });
      company = result.company;
      logger.info({ companyId: company.id }, 'Provisioned Trenty Vision company with isolated roles & permissions');
    } else {
      // Ensure company has slug & active status
      if (!company.slug || company.slug !== 'trenty-vision') {
        const [updated] = await db
          .update(schema.companies)
          .set({ slug: 'trenty-vision', status: 'active' })
          .where(eq(schema.companies.id, company.id))
          .returning();
        company = updated;
      }

      // Check if per-company roles exist
      const existingRoles = await db
        .select()
        .from(schema.roles)
        .where(eq(schema.roles.companyId, company.id));

      if (existingRoles.length === 0) {
        // Run provisioning steps for this company
        logger.info({ companyId: company.id }, 'Provisioning roles and permissions for existing company...');
        
        // 1. Create company permissions
        const permissionMap = new Map<string, string>();
        const defaultPermissions = [
          { name: 'view_chats', displayName: 'View Conversations', groupName: 'inbox', description: 'Can view conversations' },
          { name: 'send_messages', displayName: 'Send Messages', groupName: 'inbox', description: 'Can send WhatsApp text messages' },
          { name: 'send_media', displayName: 'Send Media', groupName: 'inbox', description: 'Can send photos, videos, voice notes, documents' },
          { name: 'manage_employees', displayName: 'Manage Employees', groupName: 'organization', description: 'Can create, edit and manage employees' },
          { name: 'manage_roles', displayName: 'Manage Roles', groupName: 'organization', description: 'Can manage roles and permissions' },
          { name: 'manage_stations', displayName: 'Manage Stations', groupName: 'organization', description: 'Can create and manage stations' },
          { name: 'manage_assignments', displayName: 'Manage Assignments', groupName: 'organization', description: 'Can assign and reassign conversations/leads' },
          { name: 'manage_company', displayName: 'Manage Company Profile', groupName: 'organization', description: 'Can manage company profile & settings' },
          { name: 'manage_whatsapp', displayName: 'Manage WhatsApp Accounts', groupName: 'whatsapp', description: 'Can connect, disconnect, QR scan WhatsApp' },
          { name: 'manage_automation', displayName: 'Manage Automation', groupName: 'automation', description: 'Can configure rules, bot and triggers' },
          { name: 'manage_quick_replies', displayName: 'Manage Quick Replies', groupName: 'automation', description: 'Can manage canned quick replies' },
          { name: 'manage_leads', displayName: 'Manage Leads', groupName: 'leads', description: 'Can view, edit, and advance lead stages' },
          { name: 'manage_contacts', displayName: 'Manage Contacts', groupName: 'contacts', description: 'Can manage customer contacts and details' },
          { name: 'manage_reminders', displayName: 'Manage Reminders', groupName: 'reminders', description: 'Can create, complete, snooze reminders' },
          { name: 'manage_crm', displayName: 'Manage CRM Integrations', groupName: 'crm', description: 'Can configure CRM connections and view sync' },
          { name: 'view_reports', displayName: 'View Analytics & Reports', groupName: 'reports', description: 'Can view metrics and export reports' },
          { name: 'view_audit_logs', displayName: 'View Audit Logs', groupName: 'security', description: 'Can inspect system audit trail' },
          { name: 'export_data', displayName: 'Export System Data', groupName: 'security', description: 'Can export CSV and data backups' },
          { name: 'manage_settings', displayName: 'Manage System Settings', groupName: 'settings', description: 'Can change operational parameters' },
          { name: 'manage_tags', displayName: 'Manage Tags', groupName: 'settings', description: 'Can manage conversation tags' },
          { name: 'manage_notifications', displayName: 'Manage Notifications', groupName: 'settings', description: 'Can manage notification preferences' },
        ];

        for (const p of defaultPermissions) {
          const [ins] = await db
            .insert(schema.permissions)
            .values({ ...p, companyId: company.id })
            .onConflictDoNothing()
            .returning();
          if (ins) permissionMap.set(p.name, ins.id);
        }

        // 2. Create company roles
        const [adminRole] = await db
          .insert(schema.roles)
          .values({
            companyId: company.id,
            name: 'adminstrator',
            displayName: 'Administrator (المدير)',
            description: 'صلاحيات الإدارة والتحكم الكامل بالمنظومة للشركة',
            isSystem: true,
          })
          .returning();

        const [employerRole] = await db
          .insert(schema.roles)
          .values({
            companyId: company.id,
            name: 'employer',
            displayName: 'Employer (الموظف)',
            description: 'فريق العمل وممثلو خدمة العملاء والمحادثات',
            isSystem: true,
          })
          .returning();

        // 3. Link role permissions
        for (const [permName, permId] of permissionMap.entries()) {
          await db
            .insert(schema.rolePermissions)
            .values({ roleId: adminRole.id, permissionId: permId })
            .onConflictDoNothing();

          if (['view_chats', 'send_messages', 'send_media', 'manage_reminders', 'manage_leads', 'manage_contacts', 'manage_quick_replies', 'manage_tags'].includes(permName)) {
            await db
              .insert(schema.rolePermissions)
              .values({ roleId: employerRole.id, permissionId: permId })
              .onConflictDoNothing();
          }
        }

        // 4. Update existing company users to have companyId and roleId
        const companyUsers = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, 'admin@trenty.com'));

        for (const u of companyUsers) {
          await db
            .update(schema.users)
            .set({ companyId: company.id, roleId: adminRole.id })
            .where(eq(schema.users.id, u.id));
        }
      }
    }

    // 3. Ensure Default Stations for the Company
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
      } else if (!existingStation.companyId) {
        await db
          .update(schema.stations)
          .set({ companyId: company.id })
          .where(eq(schema.stations.id, existingStation.id));
      }
    }
    logger.info('Default stations verified and linked to company');

    // 4. Clean up any leftover departments
    await db.update(schema.employees).set({ departmentId: null });
    await db.update(schema.stations).set({ departmentId: null });
    await db.delete(schema.departments);

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
