import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Heart, TrendingUp, Calendar } from 'lucide-react';

interface Campaign {
  id: number;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  isActive: boolean;
  createdAt: string;
}

export default function Dashboard() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [pledgeAmounts, setPledgeAmounts] = useState<Record<number, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns');
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json() as Promise<{ campaigns: Campaign[] }>;
    }
  });

  const { data: pledges } = useQuery({
    queryKey: ['my-pledges'],
    queryFn: async () => {
      if (!token) return [];
      // We need the user ID. The token might have it, or we can get it from context if available.
      // Assuming the AuthContext provides the user object with an ID.
      // Let's check AuthContext usage.
      const userStr = localStorage.getItem('user');
      if (!userStr) return [];
      const user = JSON.parse(userStr);
      
      const res = await fetch(`/api/pledges/user/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token
  });

  const pledgeMutation = useMutation({
    mutationFn: async ({ campaignId, amount }: { campaignId: number, amount: number }) => {
      const res = await fetch('/api/pledges', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ campaignId, amount })
      });
      if (!res.ok) throw new Error('Failed to pledge');
      return res.json();
    },
    onSuccess: () => {
      alert('Pledge successful! Thank you for your support.');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err) => {
      alert(`Pledge failed: ${err.message}`);
    }
  });

  const handlePledge = (campaignId: number) => {
    const amount = pledgeAmounts[campaignId] || 10;
    pledgeMutation.mutate({ campaignId, amount });
  };

  if (isLoading) return <div className="text-center py-12">Loading campaigns...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Active Campaigns</h1>
        <div className="text-sm text-gray-500">
          Showing {data?.campaigns.length} campaigns
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.campaigns.map((campaign) => {
          const progress = Math.min((campaign.currentAmount / campaign.goalAmount) * 100, 100);
          
          return (
            <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition flex flex-col">
              <div className="h-48 bg-slate-100 flex items-center justify-center">
                <Heart className="text-slate-300 w-16 h-16" />
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-slate-900 line-clamp-1">{campaign.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${campaign.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {campaign.isActive ? 'Active' : 'Closed'}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">
                  {campaign.description}
                </p>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-900">${campaign.currentAmount.toLocaleString()}</span>
                      <span className="text-gray-500">of ${campaign.goalAmount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        min="1"
                        value={pledgeAmounts[campaign.id] || ''}
                        onChange={(e) => setPledgeAmounts({ ...pledgeAmounts, [campaign.id]: Number(e.target.value) })}
                        placeholder="10"
                        className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handlePledge(campaign.id)}
                      disabled={pledgeMutation.isPending || !campaign.isActive}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Pledge
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp size={14} />
                  {data?.campaigns.length} backers
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {token && pledges && pledges.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">My Donation History</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-600">Date</th>
                    <th className="px-6 py-4 font-semibold text-gray-600">Amount</th>
                    <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pledges.map((pledge: any) => (
                    <tr key={pledge.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(pledge.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        ${pledge.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                          ${pledge.status === 'CAPTURED' ? 'bg-green-100 text-green-700' : 
                            pledge.status === 'FAILED' ? 'bg-red-100 text-red-700' : 
                            'bg-yellow-100 text-yellow-700'}`}>
                          {pledge.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
