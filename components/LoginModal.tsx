import React, { useState } from 'react';
import { ICONS } from '../constants';

interface LoginModalProps {
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
  error: string | null;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLogin, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-sm">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-display text-orange-800 dark:text-amber-300">Acceso Admin</h2>
          <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">{ICONS.close}</button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              name="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</label>
            <div className="relative">
              <input
                type={isPasswordVisible ? 'text' : 'password'}
                name="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-amber-400 focus:border-amber-400 pr-10"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                aria-label={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {isPasswordVisible ? ICONS.eyeSlash : ICONS.eye}
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
        </div>
        
        <div className="flex justify-end items-center gap-4 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button type="button" onClick={onClose} className="bg-slate-500 dark:bg-slate-600 text-white font-bold py-2 px-6 rounded-md hover:bg-slate-600 dark:hover:bg-slate-500 transition-colors">Cancelar</button>
          <button type="submit" className="bg-amber-400 text-slate-900 font-bold py-2 px-6 rounded-md hover:bg-amber-500 dark:hover:bg-amber-300 transition-colors">Entrar</button>
        </div>
      </form>
    </div>
  );
};

export default LoginModal;