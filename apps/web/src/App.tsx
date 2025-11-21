import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(e.target.value))
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
      <h1 className="text-3xl font-bold mb-4">CareForAll</h1>
      
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
            onChange={handleAmountChange}
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
