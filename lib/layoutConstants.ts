// Shared source of truth for the mobile bottom-tab bar's height (Sidebar.tsx)
// so ContextualLogBar.tsx's mobile offset can't silently drift out of sync
// with it again — previously each was an independently guessed magic number.
export const MOBILE_TAB_BAR_HEIGHT_REM = 4
