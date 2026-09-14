import { db } from '../../database/client';
import {
  employees,
  users,
  roles,
  departments,
  stations,
  companies,
  conversations,
  leads,
  reminders,
} from '../../database/schema/index';
import { eq, and, sql, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { PasswordService } from '../../services/password.service';
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  UpdateEmployeeStatusInput,
} from './employees.schema';
import { AuditService } from '../audit/audit.service';

const supervisorEmployee = alias(employees, 'supervisor_employee');
const supervisorUser = alias(users, 'supervisor_user');

export class EmployeesService {
  public static async getCompanyId(): Promise<string> {
    const comp = await db.query.companies.findFirst();
    if (!comp) {
      throw new Error('Default company not found');
    }
    return comp.id;
  }

  public static async list(filters?: {
    departmentId?: string;
    stationId?: string;
    supervisorId?: string;
    status?: 'active' | 'inactive' | 'away' | 'offline';
  }) {
    const conditions = [];

    if (filters?.departmentId) {
      conditions.push(eq(employees.departmentId, filters.departmentId));
    }
    if (filters?.stationId) {
      conditions.push(eq(employees.stationId, filters.stationId));
    }
    if (filters?.supervisorId) {
      conditions.push(eq(employees.supervisorId, filters.supervisorId));
    }
    if (filters?.status) {
      conditions.push(eq(employees.status, filters.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: employees.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        roleId: roles.id,
        roleName: roles.name,
        roleDisplayName: roles.displayName,
        departmentId: departments.id,
        departmentName: departments.name,
        stationId: stations.id,
        stationName: stations.name,
        supervisorId: employees.supervisorId,
        supervisorName: supervisorUser.name,
        whatsappNumber: employees.whatsappNumber,
        phone: employees.whatsappNumber,
        status: employees.status,
        lastSeenAt: employees.lastSeenAt,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .innerJoin(users, eq(employees.userId, users.id))
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(stations, eq(employees.stationId, stations.id))
      .leftJoin(supervisorEmployee, eq(employees.supervisorId, supervisorEmployee.id))
      .leftJoin(supervisorUser, eq(supervisorEmployee.userId, supervisorUser.id))
      .where(whereClause);

    // Calculate workload for each employee
    const withWorkload = await Promise.all(
      rows.map(async (emp) => {
        const [openChats, pendingLeads, pendingReminders] = await Promise.all([
          db
            .select({ count: sql<number>`count(*)` })
            .from(conversations)
            .where(
              and(
                eq(conversations.assignedEmployeeId, emp.id),
                eq(conversations.status, 'open')
              )
            )
            .then((r) => Number(r[0]?.count || 0)),

          db
            .select({ count: sql<number>`count(*)` })
            .from(leads)
            .where(
              and(
                eq(leads.assignedEmployeeId, emp.id),
                eq(leads.stage, 'new')
              )
            )
            .then((r) => Number(r[0]?.count || 0)),

          db
            .select({ count: sql<number>`count(*)` })
            .from(reminders)
            .where(
              and(
                eq(reminders.assignedUserId, emp.userId),
                eq(reminders.status, 'pending')
              )
            )
            .then((r) => Number(r[0]?.count || 0)),
        ]);

        return {
          ...emp,
          workload: {
            openConversations: openChats,
            newLeads: pendingLeads,
            pendingReminders: pendingReminders,
            totalScore: openChats * 2 + pendingLeads * 3 + pendingReminders,
          },
        };
      })
    );

    return withWorkload;
  }

  public static async getById(id: string) {
    const rows = await db
      .select({
        id: employees.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        roleId: roles.id,
        roleName: roles.name,
        roleDisplayName: roles.displayName,
        departmentId: departments.id,
        departmentName: departments.name,
        stationId: stations.id,
        stationName: stations.name,
        supervisorId: employees.supervisorId,
        supervisorName: supervisorUser.name,
        whatsappNumber: employees.whatsappNumber,
        phone: employees.whatsappNumber,
        status: employees.status,
        lastSeenAt: employees.lastSeenAt,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .innerJoin(users, eq(employees.userId, users.id))
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(stations, eq(employees.stationId, stations.id))
      .leftJoin(supervisorEmployee, eq(employees.supervisorId, supervisorEmployee.id))
      .leftJoin(supervisorUser, eq(supervisorEmployee.userId, supervisorUser.id))
      .where(eq(employees.id, id));

    const emp = rows[0];
    if (!emp) {
      throw new NotFoundError('Employee not found');
    }

    const [openChats, pendingLeads, pendingReminders] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(
          and(
            eq(conversations.assignedEmployeeId, emp.id),
            eq(conversations.status, 'open')
          )
        )
        .then((r) => Number(r[0]?.count || 0)),

      db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(
          and(
            eq(leads.assignedEmployeeId, emp.id),
            eq(leads.stage, 'new')
          )
        )
        .then((r) => Number(r[0]?.count || 0)),

      db
        .select({ count: sql<number>`count(*)` })
        .from(reminders)
        .where(
          and(
            eq(reminders.assignedUserId, emp.userId),
            eq(reminders.status, 'pending')
          )
        )
        .then((r) => Number(r[0]?.count || 0)),
    ]);

    return {
      ...emp,
      workload: {
        openConversations: openChats,
        newLeads: pendingLeads,
        pendingReminders: pendingReminders,
      },
    };
  }

  public static async create(input: CreateEmployeeInput, actorId?: string) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, input.email.toLowerCase()),
    });

    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const companyId = await this.getCompanyId();
    const passwordHash = await PasswordService.hash(input.password || 'Password123!');

    let roleId = input.roleId;
    if (!roleId) {
      const defaultRole = (await db.query.roles.findFirst({
        where: or(eq(roles.name, 'employee'), eq(roles.name, 'staff')),
      })) || (await db.query.roles.findFirst());
      if (!defaultRole) {
        throw new Error('No roles configured in system');
      }
      roleId = defaultRole.id;
    }

    // Create user record
    const [newUser] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        roleId,
        emailVerified: true,
        status: 'active',
      })
      .returning();

    // Create employee record
    const [newEmployee] = await db
      .insert(employees)
      .values({
        userId: newUser.id,
        companyId,
        departmentId: input.departmentId || null,
        stationId: input.stationId || null,
        supervisorId: input.supervisorId || null,
        whatsappNumber: input.whatsappNumber || null,
        status: input.status,
      })
      .returning();

    await AuditService.log({
      actorId,
      action: 'employee.create',
      entityType: 'employee',
      entityId: newEmployee.id,
      newValues: {
        id: newEmployee.id,
        name: newUser.name,
        email: newUser.email,
        departmentId: input.departmentId,
        stationId: input.stationId,
        supervisorId: input.supervisorId,
      },
    });

    return this.getById(newEmployee.id);
  }

  public static async update(id: string, input: UpdateEmployeeInput, actorId?: string) {
    const current = await this.getById(id);

    // Update user table fields if provided
    if (input.name || input.email || input.roleId) {
      const userUpdates: Record<string, any> = { updatedAt: new Date() };
      if (input.name) userUpdates.name = input.name;
      if (input.email) userUpdates.email = input.email.toLowerCase();
      if (input.roleId) userUpdates.roleId = input.roleId;

      await db.update(users).set(userUpdates).where(eq(users.id, current.userId));
    }

    // Update employee table fields
    const empUpdates: Record<string, any> = { updatedAt: new Date() };
    if (input.departmentId !== undefined) empUpdates.departmentId = input.departmentId;
    if (input.stationId !== undefined) empUpdates.stationId = input.stationId;
    if (input.supervisorId !== undefined) empUpdates.supervisorId = input.supervisorId;
    if (input.whatsappNumber !== undefined) empUpdates.whatsappNumber = input.whatsappNumber;
    if (input.status !== undefined) empUpdates.status = input.status;

    await db.update(employees).set(empUpdates).where(eq(employees.id, id));

    const updated = await this.getById(id);

    await AuditService.log({
      actorId,
      action: 'employee.update',
      entityType: 'employee',
      entityId: id,
      oldValues: current,
      newValues: updated,
    });

    return updated;
  }

  public static async updateStatus(id: string, status: 'active' | 'inactive' | 'away' | 'offline') {
    const [emp] = await db
      .update(employees)
      .set({
        status,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();

    if (!emp) {
      throw new NotFoundError('Employee not found');
    }

    return emp;
  }

  public static async getSupervisors() {
    return db
      .select({
        id: employees.id,
        name: users.name,
        email: users.email,
        roleName: roles.name,
      })
      .from(employees)
      .innerJoin(users, eq(employees.userId, users.id))
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(
        or(
          eq(roles.name, 'adminstrator'),
          eq(roles.name, 'supervisor'),
          eq(roles.name, 'admin'),
          eq(roles.name, 'super_admin')
        )
      );
  }

  public static async delete(id: string, actorId?: string) {
    const current = await this.getById(id);

    // Unassign relations safely
    await db.update(conversations).set({ assignedEmployeeId: null }).where(eq(conversations.assignedEmployeeId, id));
    await db.update(leads).set({ assignedEmployeeId: null }).where(eq(leads.assignedEmployeeId, id));
    await db.update(employees).set({ supervisorId: null }).where(eq(employees.supervisorId, id));

    // Delete employee record
    await db.delete(employees).where(eq(employees.id, id));

    // Delete associated user record
    if (current.userId) {
      await db.delete(users).where(eq(users.id, current.userId));
    }

    await AuditService.log({
      actorId,
      action: 'employee.delete',
      entityType: 'employee',
      entityId: id,
      oldValues: current,
    });

    return { success: true, message: 'Employee deleted successfully' };
  }
}
