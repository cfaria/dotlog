import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <h1 className="text-4xl font-bold">dotlog</h1>
        <p className="text-gray-600">
          Track your days with a simple 1-5 rating. Visualize your mood over time 
          with a beautiful GitHub-style heatmap.
        </p>
        <div className="flex gap-4 justify-center">
          <Link 
            href="/login" 
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
          >
            Get Started
          </Link>
        </div>
        
        {/* Demo heatmap preview */}
        <div className="pt-8">
          <p className="text-sm text-gray-400 mb-4">Preview</p>
          <div className="flex gap-1 justify-center flex-wrap">
            {Array.from({ length: 52 }).map((_, week) => (
              <div key={week} className="flex flex-col gap-1">
                {Array.from({ length: 7 }).map((_, day) => {
                  const level = Math.floor(Math.random() * 5)
                  const colors = ['bg-gray-100', 'bg-green-200', 'bg-green-300', 'bg-green-400', 'bg-green-500']
                  return (
                    <div 
                      key={day} 
                      className={`w-3 h-3 rounded-sm ${colors[level]}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
