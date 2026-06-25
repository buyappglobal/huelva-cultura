// In-App Notifications Dropdown Component
// Path: src/components/NotificationsBell.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Mail, Users, UserPlus, FileText } from 'lucide-react';

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: number;
  createdAt: number;
}

interface NotificationsBellProps {
  currentUser: any;
}

export default function NotificationsBell({ currentUser }: NotificationsBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications/list?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 20 seconds
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/list?userId=${currentUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
      if (res.ok) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: 1 } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`/api/notifications/list?userId=${currentUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readAll: true })
      });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, read: 1 })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_client':
        return <UserPlus size={16} className="text-purple-400" />;
      case 'assigned_partner':
        return <Users size={16} className="text-emerald-400" />;
      default:
        return <Bell size={16} className="text-white/60" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-white/60 hover:text-white bg-white/5 border border-white/10 hover:border-white/20 rounded-xl relative flex items-center justify-center transition-all cursor-pointer"
      >
        <Bell size={16} className={unreadCount > 0 ? "animate-pulse" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[9px] font-black rounded-full flex items-center justify-center text-white ring-2 ring-[#0c0c0c] animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-white/10 bg-[#0e0e0e]/95 backdrop-blur-md shadow-2xl p-4 z-50 space-y-3">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Notificaciones</span>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-[9px] font-bold text-purple-400 hover:text-purple-300 transition-all uppercase tracking-wider flex items-center gap-1"
              >
                <Check size={10} /> Marcar leído
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-white/30">
                No tienes notificaciones
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`p-3 rounded-xl border border-white/5 transition-all text-left flex gap-3 relative group ${!n.read ? 'bg-white/[0.03]' : 'bg-transparent'}`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className={`text-xs truncate ${!n.read ? 'font-bold text-white' : 'text-white/70'}`}>{n.title}</p>
                    <p className="text-[10px] text-white/40 leading-snug break-words">{n.message}</p>
                    <span className="text-[8px] text-white/20 block pt-0.5">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {!n.read && (
                    <button 
                      onClick={() => handleMarkAsRead(n.id)}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-white/40 hover:text-white bg-white/5 rounded-md border border-white/5"
                    >
                      <Check size={10} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
