'use client'

import { GridItemSizeContext } from '@/components/dashboard/GridItemSizeContext'

// Full-page module content needs widgets to render in their "expanded" size
// tier — the existing widgets branch on useGridItemSize(), so this simply
// provides a large w/h instead of the small bento-cell size they'd otherwise
// default to. Not a fork of widget logic, just the size context they already read.
//
// BUG FIX: this used to render ONLY a context provider, with no DOM element
// of its own — meaning it never gave widgets an actual CSS height to fill.
// In the old bento grid, react-grid-layout gives every item a real pixel
// height (rowHeight={80} × h grid units), so a widget's internal `h-full`
// resolves against something definite. Here there was nothing: the module
// page's plain flex column has no defined height, so `h-full` collapsed to
// `auto`. Any widget whose content is entirely absolutely-positioned (e.g.
// BodyWidget's <img>/<svg> figure layer, which has zero intrinsic content
// height) then silently rendered at 0px height — invisible, even though the
// DOM node was present and the image loaded fine. Widgets with real text/
// chart content masked the same underlying bug by auto-sizing off their
// content instead. Fix: give this an explicit pixel height matching the
// same 80px-per-unit convention every call site already assumed when
// choosing its `h` value, so `h-full` has a real, non-zero basis.
const ROW_HEIGHT_PX = 80

export function ModulePageClient({ w = 8, h = 8, children }: { w?: number; h?: number; children: React.ReactNode }) {
  return (
    <GridItemSizeContext.Provider value={{ w, h }}>
      <div style={{ height: h * ROW_HEIGHT_PX }}>
        {children}
      </div>
    </GridItemSizeContext.Provider>
  )
}
