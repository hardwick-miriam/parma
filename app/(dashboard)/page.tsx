import { redirect } from 'next/navigation'

// Default view switched to the new portrait-first module shell (Jarvis
// restructure) once every module was built and verified. The pre-existing
// bento dashboard this page used to render directly (DashboardGrid.tsx) has
// since been retired entirely — /grid now redirects here too.
export default function RootPage() {
  redirect('/main')
}
