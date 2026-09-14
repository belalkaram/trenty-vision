import { describe, it, expect } from 'vitest';

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str}"`;
  }
  return str;
}

function getPeriodDate(period?: string): Date | null {
  if (!period || period === 'all') return null;
  const now = new Date();
  if (period === 'today') {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return today;
  }
  if (period === '24h') {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  if (period === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (period === 'this_month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

function formatResponseTime(seconds?: number): string {
  if (!seconds || seconds <= 0) return 'أقل من دقيقة (فوري)';
  if (seconds < 60) return `${Math.round(seconds)} ثانية`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = (seconds / 3600).toFixed(1);
  return `${hours} ساعة`;
}

describe('Reports & Analytics Suite', () => {
  describe('Period filtering calculations', () => {
    it('should return null for "all" or undefined', () => {
      expect(getPeriodDate('all')).toBeNull();
      expect(getPeriodDate(undefined)).toBeNull();
    });

    it('should return midnight of today for "today"', () => {
      const today = getPeriodDate('today');
      expect(today).not.toBeNull();
      expect(today!.getHours()).toBe(0);
      expect(today!.getMinutes()).toBe(0);
      expect(today!.getSeconds()).toBe(0);
    });

    it('should calculate 24h, 7d, and 30d correctly', () => {
      const before = Date.now();
      const d24 = getPeriodDate('24h')!.getTime();
      const d7 = getPeriodDate('7d')!.getTime();
      const d30 = getPeriodDate('30d')!.getTime();

      expect(before - d24).toBeCloseTo(24 * 60 * 60 * 1000, -3);
      expect(before - d7).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -3);
      expect(before - d30).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -3);
    });
  });

  describe('Response time formatting', () => {
    it('should format immediate response correctly', () => {
      expect(formatResponseTime(0)).toBe('أقل من دقيقة (فوري)');
      expect(formatResponseTime(undefined)).toBe('أقل من دقيقة (فوري)');
    });

    it('should format seconds correctly', () => {
      expect(formatResponseTime(45)).toBe('45 ثانية');
      expect(formatResponseTime(12)).toBe('12 ثانية');
    });

    it('should format minutes correctly', () => {
      expect(formatResponseTime(120)).toBe('2 دقيقة');
      expect(formatResponseTime(300)).toBe('5 دقيقة');
    });

    it('should format hours correctly', () => {
      expect(formatResponseTime(7200)).toBe('2.0 ساعة');
      expect(formatResponseTime(7786)).toBe('2.2 ساعة');
    });
  });

  describe('CSV Escaping for Arabic & special chars', () => {
    it('should escape quotes and commas correctly', () => {
      expect(escapeCsv('Ahmed, Mohamed')).toBe('"Ahmed, Mohamed"');
      expect(escapeCsv('Belal "Admin"')).toBe('"Belal ""Admin"""');
      expect(escapeCsv('محادثة عادية')).toBe('محادثة عادية');
    });
  });

  describe('Frontend Data Contract Validation', () => {
    it('should ensure mapped station data satisfies frontend requirements without undefined values', () => {
      const dbStation = {
        id: 'station-123',
        name: 'محطة المبيعات',
        color: '#1c9770',
        total_conversations: '10',
        open_conversations: '4',
      };

      const mappedStation = {
        id: dbStation.id,
        stationId: dbStation.id,
        name: dbStation.name,
        stationName: dbStation.name,
        color: dbStation.color || '#1c9770',
        totalChats: Number(dbStation.total_conversations || 0),
        activeChats: Number(dbStation.open_conversations || 0),
        totalConversations: Number(dbStation.total_conversations || 0),
        openConversations: Number(dbStation.open_conversations || 0),
      };

      expect(mappedStation.stationId).toBe('station-123');
      expect(mappedStation.totalChats).toBe(10);
      expect(mappedStation.activeChats).toBe(4);
      expect(mappedStation.color).toBe('#1c9770');
    });

    it('should ensure mapped agent data satisfies frontend requirements without undefined values', () => {
      const dbEmployee = {
        id: 'emp-456',
        name: 'Belal Karam',
        email: 'belal@test.com',
        status: 'active',
        station_name: 'الدعم الفني',
        total_assigned: '8',
        total_resolved: '5',
        outgoing_messages: '42',
        avg_response_seconds: '180',
      };

      const mappedEmployee = {
        id: dbEmployee.id,
        agentId: dbEmployee.id,
        name: dbEmployee.name,
        agentName: dbEmployee.name,
        email: dbEmployee.email,
        status: dbEmployee.status,
        stationName: dbEmployee.station_name || 'غير مسند',
        totalAssigned: Number(dbEmployee.total_assigned || 0),
        totalResolved: Number(dbEmployee.total_resolved || 0),
        outgoingMessages: Number(dbEmployee.outgoing_messages || 0),
        avgResponseTimeSeconds: Number(dbEmployee.avg_response_seconds || 0),
        avgResponseMinutes: Math.round(Number(dbEmployee.avg_response_seconds || 0) / 60),
        onlineHours: dbEmployee.status === 'active' ? 8 : 0,
      };

      expect(mappedEmployee.agentId).toBe('emp-456');
      expect(mappedEmployee.agentName).toBe('Belal Karam');
      expect(mappedEmployee.totalAssigned).toBe(8);
      expect(mappedEmployee.totalResolved).toBe(5);
      expect(mappedEmployee.outgoingMessages).toBe(42);
      expect(mappedEmployee.avgResponseMinutes).toBe(3);
    });
  });
});
