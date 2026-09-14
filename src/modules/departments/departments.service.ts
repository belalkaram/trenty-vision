import { db } from '../../database/client';
import { departments, companies, employees, stations } from '../../database/schema/index';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '../../utils/errors';
import { CreateDepartmentInput, UpdateDepartmentInput } from './departments.schema';
import { AuditService } from '../audit/audit.service';

export class DepartmentsService {
  public static async getCompanyId(): Promise<string> {
    const comp = await db.query.companies.findFirst();
    if (!comp) {
      throw new Error('Default company not found');
    }
    return comp.id;
  }

  public static async list() {
    return db.select().from(departments);
  }

  public static async getById(id: string) {
    const dept = await db.query.departments.findFirst({
      where: eq(departments.id, id),
    });
    if (!dept) {
      throw new NotFoundError('Department not found');
    }
    return dept;
  }

  public static async create(input: CreateDepartmentInput, actorId?: string) {
    const companyId = await this.getCompanyId();
    const [dept] = await db
      .insert(departments)
      .values({
        companyId,
        name: input.name,
        description: input.description,
        active: input.active ?? true,
      })
      .returning();

    await AuditService.log({
      actorId,
      action: 'department.create',
      entityType: 'department',
      entityId: dept.id,
      newValues: dept,
    });

    return dept;
  }

  public static async update(id: string, input: UpdateDepartmentInput, actorId?: string) {
    const existing = await this.getById(id);

    const [updated] = await db
      .update(departments)
      .set({
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        active: input.active ?? existing.active,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();

    await AuditService.log({
      actorId,
      action: 'department.update',
      entityType: 'department',
      entityId: id,
      oldValues: existing,
      newValues: updated,
    });

    return updated;
  }

  public static async delete(id: string, actorId?: string) {
    const existing = await this.getById(id);

    // Unassign employees and stations
    await db.update(employees).set({ departmentId: null }).where(eq(employees.departmentId, id));
    await db.update(stations).set({ departmentId: null }).where(eq(stations.departmentId, id));

    await db.delete(departments).where(eq(departments.id, id));

    await AuditService.log({
      actorId,
      action: 'department.delete',
      entityType: 'department',
      entityId: id,
      oldValues: existing,
    });

    return { success: true, message: 'Department deleted successfully' };
  }
}
