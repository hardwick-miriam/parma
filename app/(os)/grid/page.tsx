import { redirect } from 'next/navigation'

// The old bento dashboard this route used to render (DashboardGrid.tsx,
// react-grid-layout, the widget catalog/edit-mode) has been retired now that
// the module OS (Main + per-module pages) is the single daily driver —
// maintaining both was causing real sync bugs. Kept as a redirect, not a
// 404, so any existing bookmark or shared link still lands somewhere real.
export default function GridPage() {
  redirect('/main')
}
