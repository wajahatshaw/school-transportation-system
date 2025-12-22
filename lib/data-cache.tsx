'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { Student, Driver } from '@prisma/client'

interface DataCache {
  students: Student[] | null
  drivers: Driver[] | null
}

interface DataCacheContext {
  cache: DataCache
  setStudents: (students: Student[]) => void
  setDrivers: (drivers: Driver[]) => void
  clearCache: () => void
}

const DataCacheContext = createContext<DataCacheContext | undefined>(undefined)

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<DataCache>({
    students: null,
    drivers: null,
  })

  const setStudents = useCallback((students: Student[]) => {
    setCache(prev => ({ ...prev, students }))
  }, [])

  const setDrivers = useCallback((drivers: Driver[]) => {
    setCache(prev => ({ ...prev, drivers }))
  }, [])

  const clearCache = useCallback(() => {
    setCache({ students: null, drivers: null })
  }, [])

  return (
    <DataCacheContext.Provider value={{ cache, setStudents, setDrivers, clearCache }}>
      {children}
    </DataCacheContext.Provider>
  )
}

export function useDataCache() {
  const context = useContext(DataCacheContext)
  if (context === undefined) {
    throw new Error('useDataCache must be used within a DataCacheProvider')
  }
  return context
}
