import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, BarChart3 } from 'lucide-react';

interface Campaign {
  id: number;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goalAmount: 0
  });

  const { data } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<{ campaigns: Campaign[] }>;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      setShowCreateForm(false);
      setFormData({ title: '', description: '', goalAmount: 0 });
      alert('Campaign created successfully!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      alert('Campaign deactivated successfully!');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to deactivate this campaign?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-gray-500">Manage campaigns and view system statistics</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          {showCreateForm ? 'Cancel' : <><Plus size={18} /> New Campaign</>}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-bold mb-4">Create New Campaign</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.currentTarget.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Goal Amount ($)</label>
                <input
                  type="number"
                  value={formData.goalAmount}
                  onChange={(e) => setFormData({ ...formData, goalAmount: Number(e.currentTarget.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.currentTarget.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none h-24"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">ID</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Title</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Goal</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Raised</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-gray-500">#{campaign.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{campaign.title}</td>
                  <td className="px-6 py-4 text-gray-600">${campaign.goalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-green-600 font-medium">${campaign.currentAmount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${campaign.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {campaign.isActive ? 'Active' : 'Closed'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(campaign.id)} 
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
