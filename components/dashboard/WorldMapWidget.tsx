'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

// World Atlas topojson — free, no API key
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ISO 3166-1 alpha-3 → numeric ID (world-atlas uses numeric codes)
const A3_TO_NUM: Record<string, number> = {
  AFG:4,AGO:24,ALB:8,AND:20,ARE:784,ARG:32,ARM:51,AUS:36,AUT:40,AZE:31,
  BDI:108,BEL:56,BEN:204,BFA:854,BGD:50,BGR:100,BHR:48,BHS:44,BIH:70,
  BLR:112,BLZ:84,BOL:68,BRA:76,BRB:52,BRN:96,BTN:64,BWA:72,CAF:140,
  CAN:124,CHE:756,CHL:152,CHN:156,CIV:384,CMR:120,COD:180,COG:178,COL:170,
  CRI:188,CUB:192,CYP:196,CZE:203,DEU:276,DJI:262,DNK:208,DOM:214,DZA:12,
  ECU:218,EGY:818,ERI:232,ESP:724,EST:233,ETH:231,FIN:246,FJI:242,FRA:250,
  GAB:266,GBR:826,GEO:268,GHA:288,GIN:324,GMB:270,GNB:624,GNQ:226,GRC:300,
  GTM:320,GUY:328,HND:340,HRV:191,HTI:332,HUN:348,IDN:360,IND:356,IRL:372,
  IRN:364,IRQ:368,ISL:352,ISR:376,ITA:380,JAM:388,JOR:400,JPN:392,KAZ:398,
  KEN:404,KGZ:417,KHM:116,KWT:414,LAO:418,LBN:422,LBR:430,LBY:434,LKA:144,
  LSO:426,LTU:440,LUX:442,LVA:428,MAR:504,MDA:498,MDG:450,MDV:462,MEX:484,
  MKD:807,MLI:466,MMR:104,MNE:499,MNG:496,MOZ:508,MRT:478,MUS:480,MWI:454,
  MYS:458,NAM:516,NER:562,NGA:566,NIC:558,NLD:528,NOR:578,NPL:524,NZL:554,
  OMN:512,PAK:586,PAN:591,PER:604,PHL:608,PNG:598,POL:616,PRK:408,PRT:620,
  PRY:600,QAT:634,ROU:642,RUS:643,RWA:646,SAU:682,SDN:729,SEN:686,SGP:702,
  SLE:694,SLV:222,SOM:706,SRB:688,SSD:728,SUR:740,SVK:703,SVN:705,SWE:752,
  SWZ:748,SYR:760,TCD:148,TGO:768,THA:764,TJK:762,TKM:795,TLS:626,TTO:780,
  TUN:788,TUR:792,TWN:158,TZA:834,UGA:800,UKR:804,URY:858,USA:840,UZB:860,
  VEN:862,VNM:704,YEM:887,ZAF:710,ZMB:894,ZWE:716,SYC:690,STP:678,
  KOR:410,MLT:470,
}

function visitedSet(codes: string[]): Set<number> {
  const s = new Set<number>()
  for (const c of codes) {
    const n = A3_TO_NUM[c.toUpperCase()]
    if (n != null) s.add(n)
  }
  return s
}

function MiniMap({ visited }: { visited: Set<number> }) {
  return (
    <ComposableMap
      projectionConfig={{ scale: 120, center: [10, 0] }}
      style={{ width: '100%', height: '100%' }}
    >
      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              fill={visited.has(Number(geo.id)) ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={0.3}
              style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
            />
          ))
        }
      </Geographies>
    </ComposableMap>
  )
}

function FullMap({
  visited,
  onClose,
  onRemove,
}: {
  visited: Set<number>
  onClose: () => void
  onRemove: (numeric: number) => void
}) {
  const [mounted, setMounted] = useState(false)
  const [tooltip, setTooltip] = useState<string | null>(null)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  // Reverse lookup numeric → alpha-3 for tooltip/delete
  const numToA3: Record<number, string> = {}
  for (const [a3, num] of Object.entries(A3_TO_NUM)) numToA3[num] = a3

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 9999, background: 'var(--bg)' }}
    >
      <div className="flex items-center justify-between px-5 pt-6 pb-3 border-b border-border shrink-0">
        <div>
          <h2 className="text-lg font-bold text-text">Places visited</h2>
          <p className="text-xs text-text-subtle mt-0.5">{visited.size} {visited.size === 1 ? 'country' : 'countries'}</p>
        </div>
        <button
          onClick={onClose}
          className="text-text-subtle hover:text-text transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <ComposableMap
          projectionConfig={{ scale: 140, center: [10, 10] }}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const isVisited = visited.has(Number(geo.id))
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isVisited ? 'var(--accent)' : 'rgba(255,255,255,0.07)'}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: 'none', cursor: isVisited ? 'pointer' : 'default' },
                      hover: { outline: 'none', cursor: isVisited ? 'pointer' : 'default' },
                      pressed: { outline: 'none' },
                    }}
                    onClick={() => {
                      if (!isVisited) return
                      const a3 = numToA3[Number(geo.id)]
                      if (a3) setTooltip(tooltip === a3 ? null : a3)
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>

        {tooltip && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-xl"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-md)' }}
          >
            <span className="text-sm font-medium text-text">{tooltip}</span>
            <button
              onClick={() => {
                const n = A3_TO_NUM[tooltip]
                if (n != null) onRemove(n)
                setTooltip(null)
              }}
              className="text-xs text-negative hover:text-red-300 transition-colors"
            >
              Remove
            </button>
            <button onClick={() => setTooltip(null)} className="text-text-subtle hover:text-text text-lg leading-none">×</button>
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-border shrink-0">
        <p className="text-xs text-text-subtle">Tap a highlighted country to remove it · Log visits naturally: "I've been to Japan"</p>
      </div>
    </div>,
    document.body
  )
}

export function WorldMapWidget({ initialCountries }: { initialCountries?: string[] }) {
  const [countries, setCountries] = useState<string[]>(initialCountries ?? [])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(!initialCountries)

  useEffect(() => {
    if (initialCountries) return
    fetch('/api/countries')
      .then((r) => r.json())
      .then((d) => setCountries(d.countries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [initialCountries])

  const visited = visitedSet(countries)

  function handleRemove(numeric: number) {
    const numToA3: Record<number, string> = {}
    for (const [a3, num] of Object.entries(A3_TO_NUM)) numToA3[num] = a3
    const a3 = numToA3[numeric]
    if (!a3) return
    setCountries((prev) => prev.filter((c) => c !== a3))
    fetch(`/api/countries?code=${a3}`, { method: 'DELETE' }).catch(() => {})
  }

  return (
    <>
      <div
        className="rounded-2xl bg-surface border border-border overflow-hidden cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform duration-150"
        style={{ boxShadow: 'var(--shadow-md)', height: '180px' }}
        onClick={() => !loading && setOpen(true)}
      >
        <div className="relative w-full h-full">
          {/* Map fills the card */}
          <div className="absolute inset-0" style={{ opacity: loading ? 0.3 : 1 }}>
            <MiniMap visited={visited} />
          </div>

          {/* Overlay with count */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-white/70 uppercase tracking-widest" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Places I've been
              </h2>
            </div>
            <div>
              <p className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                {countries.length}
              </p>
              <p className="text-xs text-white/60" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {countries.length === 1 ? 'country' : 'countries'} visited
              </p>
            </div>
          </div>
        </div>
      </div>

      {open && (
        <FullMap
          visited={visited}
          onClose={() => setOpen(false)}
          onRemove={handleRemove}
        />
      )}
    </>
  )
}
