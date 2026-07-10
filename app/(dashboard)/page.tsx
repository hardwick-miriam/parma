import { redirect } from 'next/navigation'

// Default view switched to the new portrait-first module shell (Jarvis
// restructure) once every module was built and verified. The pre-existing
// bento dashboard this page used to render directly now lives at /grid
// (app/(os)/grid/page.tsx) — identical component and data-fetching, just a
// different route so it stays reachable rather than being deleted.
export default function RootPage() {
  redirect('/main')
}
