'use client'

import { GridItemSizeContext } from '@/components/dashboard/GridItemSizeContext'

// Full-page module content needs widgets to render in their "expanded" size
// tier — the existing widgets branch on useGridItemSize(), so this simply
// provides a large w/h instead of the small bento-cell size they'd otherwise
// default to. Not a fork of widget logic, just the size context they already read.
export function ModulePageClient({ w = 8, h = 8, children }: { w?: number; h?: number; children: React.ReactNode }) {
  return (
    <GridItemSizeContext.Provider value={{ w, h }}>
      {children}
    </GridItemSizeContext.Provider>
  )
}
