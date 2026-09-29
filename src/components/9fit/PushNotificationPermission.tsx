import { useState } from 'react';
import { requestNotificationPermission } from '@/services/fcm';

export const PushNotificationPermission = () => {
  const [enabled, setEnabled] = useState(false);

  const handleRequest = async () => {
    const token = await requestNotificationPermission();
    if (token) {
      setEnabled(true);
      // In a real app, you might want to send this token to Supabase
    }
  };

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10 my-4">
      <h3 className="text-white font-bold mb-2">Notificações Push</h3>
      {!enabled ? (
        <button 
          onClick={handleRequest}
          className="bg-primary text-black px-4 py-2 rounded-lg text-sm font-bold"
        >
          Habilitar Notificações
        </button>
      ) : (
        <p className="text-green-500 text-sm">Notificações habilitadas!</p>
      )}
    </div>
  );
};
