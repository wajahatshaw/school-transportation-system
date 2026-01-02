export const queryKeys = {
  trip: (tripId: string) => ['trip', tripId] as const,
  tripAttendance: (tripId: string) => ['trip-attendance', tripId] as const,
  students: () => ['students'] as const,
  auditLogs: (filters?: { tableName?: string; action?: string }) =>
    ['audit-logs', filters ?? {}] as const,
}


