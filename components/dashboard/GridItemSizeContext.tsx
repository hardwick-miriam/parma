'use client'

import { createContext, useContext } from 'react'

interface GridSize { w: number; h: number }

export const GridItemSizeContext = createContext<GridSize>({ w: 4, h: 4 })

export function useGridItemSize() {
  return useContext(GridItemSizeContext)
}
