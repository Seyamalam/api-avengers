import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

interface Notification {
  type: string;
  data: any;
  timestamp: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3006/ws');

    ws.onopen = () => {
      console.log('Connected to Notification Service');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'WELCOME') return;

        const newNotification = {
          type: message.type,
          data: message.data,
          timestamp: new Date().toISOString()
        };

        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      } catch (err) {
        console.error('Failed to parse notification', err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl w-80 mb-4 overflow-hidden border border-gray-200">
          <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
            <h3 className="font-bold">Notifications</h3>
            <button onClick={() => setNotifications([])} className="text-xs text-gray-400 hover:text-white">Clear</button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
            ) : (
              notifications.map((notif, idx) => (
                <div key={idx} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-xs text-blue-600 px-2 py-0.5 bg-blue-50 rounded-full">
                      {notif.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">
                    {notif.type === 'CAMPAIGN_CREATED' && `New campaign: ${notif.data.title}`}
                    {notif.type === 'PLEDGE_CREATED' && `New pledge of $${notif.data.amount} for campaign #${notif.data.campaignId}`}
                    {notif.type === 'PAYMENT_SUCCEEDED' && `Payment succeeded for pledge #${notif.data.pledgeId}`}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      <button 
        onClick={handleOpen}
        className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition relative"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
