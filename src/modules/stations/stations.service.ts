import { db } from '../../database/client';
import { stations, companies, departments, employees, users, conversations, leads } from '../../database/schema/index';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { NotFoundError } from '../../utils/errors';
import { CreateStationInput, UpdateStationInput } from './stations.schema';
import { AuditService } from '../audit/audit.service';

export class StationsService {
  public static async getCompanyId(): Promise<string> {
    const comp = await db.query.companies.findFirst();
    if (!comp) {
      throw new Error('Default company not found');
    }
    return comp.id;
  }

  public static async list() {
    const allStations = await db
      .select({
        id: stations.id,
        name: stations.name,
        code: stations.code,
        color: stations.color,
        description: stations.description,
        maxCapacity: stations.maxCapacity,
        routingWeight: stations.routingWeight,
        active: stations.active,
        departmentId: stations.departmentId,
        departmentName: departments.name,
        createdAt: stations.createdAt,
        updatedAt: stations.updatedAt,
      })
      .from(stations)
      .leftJoin(departments, eq(stations.departmentId, departments.id));

    // For each station, find assigned employees and active chats count
    const stationsWithStaff = await Promise.all(
      allStations.map(async (st) => {
        const staff = await db
          .select({
            employeeId: employees.id,
            userId: users.id,
            name: users.name,
            email: users.email,
            status: employees.status,
            whatsappNumber: employees.whatsappNumber,
          })
          .from(employees)
          .innerJoin(users, eq(employees.userId, users.id))
          .where(eq(employees.stationId, st.id));

        const [chatsRow] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(conversations)
          .where(and(eq(conversations.assignedStationId, st.id), eq(conversations.status, 'open')));

        return {
          ...st,
          code: st.code || '',
          color: st.color || '#1c9770',
          maxCapacity: st.maxCapacity,
          isUnlimited: st.maxCapacity === null,
          routingWeight: st.routingWeight ?? 1,
          status: st.active ? 'active' : 'inactive',
          assignedAgentsCount: staff.length,
          employeeCount: staff.length,
          activeChatsCount: chatsRow?.count || 0,
          employees: staff,
          employeeIds: staff.map((s) => s.employeeId),
        };
      })
    );

    return stationsWithStaff;
  }

  public static async getById(id: string) {
    const st = await db
      .select({
        id: stations.id,
        name: stations.name,
        code: stations.code,
        color: stations.color,
        description: stations.description,
        maxCapacity: stations.maxCapacity,
        routingWeight: stations.routingWeight,
        active: stations.active,
        departmentId: stations.departmentId,
        departmentName: departments.name,
        createdAt: stations.createdAt,
        updatedAt: stations.updatedAt,
      })
      .from(stations)
      .leftJoin(departments, eq(stations.departmentId, departments.id))
      .where(eq(stations.id, id))
      .then((rows) => rows[0]);

    if (!st) {
      throw new NotFoundError('Station not found');
    }

    const staff = await db
      .select({
        employeeId: employees.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        status: employees.status,
        whatsappNumber: employees.whatsappNumber,
      })
      .from(employees)
      .innerJoin(users, eq(employees.userId, users.id))
      .where(eq(employees.stationId, st.id));

    const [chatsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(and(eq(conversations.assignedStationId, st.id), eq(conversations.status, 'open')));

    return {
      ...st,
      code: st.code || '',
      color: st.color || '#1c9770',
      maxCapacity: st.maxCapacity,
      isUnlimited: st.maxCapacity === null,
      routingWeight: st.routingWeight ?? 1,
      status: st.active ? 'active' : 'inactive',
      assignedAgentsCount: staff.length,
      employeeCount: staff.length,
      activeChatsCount: chatsRow?.count || 0,
      employees: staff,
      employeeIds: staff.map((s) => s.employeeId),
    };
  }

  public static async create(input: CreateStationInput, actorId?: string) {
    const companyId = await this.getCompanyId();
    const [station] = await db
      .insert(stations)
      .values({
        companyId,
        departmentId: input.departmentId || null,
        name: input.name,
        code: input.code || null,
        color: input.color || '#1c9770',
        description: input.description || null,
        maxCapacity: input.maxCapacity !== undefined ? input.maxCapacity : 20,
        routingWeight: input.routingWeight ?? 1,
        active: input.active ?? true,
      })
      .returning();

    if (input.employeeIds && input.employeeIds.length > 0) {
      await db
        .update(employees)
        .set({ stationId: station.id })
        .where(inArray(employees.id, input.employeeIds));
    }

    await AuditService.log({
      actorId,
      action: 'station.create',
      entityType: 'station',
      entityId: station.id,
      newValues: station,
    });

    return this.getById(station.id);
  }

  public static async update(id: string, input: UpdateStationInput, actorId?: string) {
    const existing = await this.getById(id);

    const [updated] = await db
      .update(stations)
      .set({
        name: input.name ?? existing.name,
        departmentId: input.departmentId !== undefined ? input.departmentId : existing.departmentId,
        code: input.code !== undefined ? input.code : existing.code,
        color: input.color !== undefined ? input.color : existing.color,
        description: input.description !== undefined ? input.description : existing.description,
        maxCapacity: input.maxCapacity !== undefined ? input.maxCapacity : existing.maxCapacity,
        routingWeight: input.routingWeight !== undefined ? input.routingWeight : existing.routingWeight,
        active: input.active !== undefined ? input.active : existing.active,
        updatedAt: new Date(),
      })
      .where(eq(stations.id, id))
      .returning();

    if (input.employeeIds !== undefined) {
      // Disassociate current employees from this station
      await db.update(employees).set({ stationId: null }).where(eq(employees.stationId, id));
      // Re-assign selected employees
      if (input.employeeIds.length > 0) {
        await db
          .update(employees)
          .set({ stationId: id })
          .where(inArray(employees.id, input.employeeIds));
      }
    }

    await AuditService.log({
      actorId,
      action: 'station.update',
      entityType: 'station',
      entityId: id,
      oldValues: existing,
      newValues: updated,
    });

    return this.getById(id);
  }

  public static async delete(id: string, actorId?: string) {
    const existing = await this.getById(id);

    // Unassign employees and conversations
    await db.update(employees).set({ stationId: null }).where(eq(employees.stationId, id));
    await db.update(conversations).set({ assignedStationId: null }).where(eq(conversations.assignedStationId, id));
    await db.update(leads).set({ stationId: null }).where(eq(leads.stationId, id));

    await db.delete(stations).where(eq(stations.id, id));

    await AuditService.log({
      actorId,
      action: 'station.delete',
      entityType: 'station',
      entityId: id,
      oldValues: existing,
    });

    return { success: true, message: 'Station deleted successfully' };
  }
}

