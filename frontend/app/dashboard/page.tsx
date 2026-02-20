'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/supabase-provider'
import Link from 'next/link'

interface Entry {
  id: string
  date: string
  level: number
  note: string | null
}

export default function Dashboard() {
  const { supabase, user } = useSupabase()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedLevel, setSelectedLevel] = useState(3)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!user) return
    fetchEntries()
  }, [user])

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('date', { ascending: false })
    
    if (!error && data) {
      setEntries(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const { error } = await supabase
      .from('entries')
      .upsert({
        user_id: user.id,
        date: selectedDate,
        level: selectedLevel,
        note: note || null,
      }, { onConflict: 'user_id,date' })

    if (!error) {
      fetchEntries()
      setNote('')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Please <Link href="/login" className="underline">sign in</Link></p>
        </div>
      </main>
    )
  }

  // Generate heatmap data
  const generateHeatmapData = () => {
    const data: Record<string, number> = {}
    entries.forEach(entry => {
      data[entry.date] = entry.level
    })
    return data
  }

  const heatmapData = generateHeatmapData()

  // Generate calendar grid (last 52 weeks)
  const generateCalendarGrid = () => {
    const weeks = []
    const today = new Date()
    
    for (let w = 51; w >= 0; w--) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(today)
        date.setDate(date.getDate() - (w * 7 + (6 - d)))
        const dateStr = date.toISOString().split('T')[0]
        week.push({
          date: dateStr,
          level: heatmapData[dateStr] || 0,
        })
      }
      weeks.push(week)
    }
    return weeks
  }

  const calendarGrid = generateCalendarGrid()
  const levelColors = ['bg-gray-100', 'bg-green-200', 'bg-green-300', 'bg-green-400', 'bg-green-500', 'bg-green-600']

  return (
    <main className="min-h-screen p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/" className="text-2xl font-bold">dotlog</Link>
        <button 
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-black"
        >
          Logout
        </button>
      </div>

      {/* Daily Entry Form */}
      <div className="bg-white border rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">How was your day?</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Level (1-5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedLevel(level)}
                    className={`w-10 h-10 rounded-lg font-medium transition ${
                      selectedLevel === level 
                        ? 'bg-black text-white' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened today?"
              className="w-full px-3 py-2 border rounded-lg h-24 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Save Entry
          </button>
        </form>
      </div>

      {/* Heatmap */}
      <div className="bg-white border rounded-xl p-6 mb-8 shadow-sm overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Your Year</h2>
        <div className="flex gap-1 min-w-max">
          {calendarGrid.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1">
              {week.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  title={`${day.date}: Level ${day.level}`}
                  className={`w-3 h-3 rounded-sm ${levelColors[day.level]} hover:ring-2 hover:ring-black cursor-pointer`}
                />
              ))}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
          <span>Less</span>
          {levelColors.map((color, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Recent Entries */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Recent Entries</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-gray-500">No entries yet. Start tracking above!</p>
        ) : (
          <div className="space-y-3">
            {entries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium ${levelColors[entry.level]}`}>
                  {entry.level}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{entry.date}</p>
                  {entry.note && (
                    <p className="text-sm text-gray-600">{entry.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
