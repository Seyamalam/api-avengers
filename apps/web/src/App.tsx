import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import AdminPanel from './AdminPanel'

interface Campaign {
  id: number;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
}

function App() {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState(10)
  const [showAdmin, setShowAdmin] = useState(false)

  if (showAdmin) {
    return (
      <div>
        <div className="bg-blue-600 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">CareForAll</h1>
            <button 
              onClick={() => setShowAdmin(false)}
              className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100"
            >
              Back to Public Site
            </button>
          </div>
        </div>
        <AdminPanel />
      </div>
    )
  }

  const { data: campaigns, isLoading } = useQuery<Campaign>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns/1') // Fetch campaign 1 for demo
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json() as Promise<Campaign>
    }
  })

  const pledgeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Failed to pledge')
      return res.json()
    },
    onSuccess: () => {
      alert('Pledge successful!')
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    }
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">CareForAll</h1>
        <button 
          onClick={() => setShowAdmin(true)}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
        >
          Admin Panel
        </button>
      </div>
      
      <div className="border p-4 rounded shadow">
        <h2 className="text-xl font-bold">{campaigns?.title || 'Campaign Title'}</h2>
        <p>{campaigns?.description || 'Description'}</p>
        <div className="mt-4">
          <p>Goal: ${campaigns?.goalAmount}</p>
          <p>Raised: ${campaigns?.currentAmount || 0}</p>
        </div>

        <div className="mt-4 flex gap-2">
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(Number(e.currentTarget.value))}
            className="border p-2 rounded"
          />
          <button 
            onClick={() => pledgeMutation.mutate({ campaignId: 1, amount })}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={pledgeMutation.isPending}
          >
            {pledgeMutation.isPending ? 'Processing...' : 'Donate'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
