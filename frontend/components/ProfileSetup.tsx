'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, CheckCircle, User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileSetup({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLocating(false);
          toast.success(t('profileSetup.locationFound', 'Location acquired!'));
        },
        (error) => {
          console.error('Error fetching location:', error);
          setIsLocating(false);
          toast.error(t('profileSetup.locationError', 'Could not get location. Please allow access.'));
        }
      );
    } else {
      setIsLocating(false);
      toast.error('Geolocation is not supported by your browser');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location) {
      toast.error('Please provide your name and location');
      return;
    }

    setIsSubmitting(true);
    try {
      // Here we would typically call an API to update the user's profile
      // await api.put('/users/profile', { name, location });
      
      // Save locally for demo purposes
      localStorage.setItem('cc_user_name', name);
      localStorage.setItem('cc_user_location', JSON.stringify(location));
      
      toast.success(t('profileSetup.success', 'Profile setup complete!'));
      onComplete();
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="bg-blue-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <User size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold">{t('profileSetup.title', 'Complete Your Profile')}</h2>
          <p className="text-blue-100 mt-2 text-sm">
            {t('profileSetup.subtitle', 'Help us connect you with your local neighborhood')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('profileSetup.nameLabel', 'Full Name')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              placeholder={t('profileSetup.namePlaceholder', 'e.g. Ramesh Kumar')}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('profileSetup.locationLabel', 'Default Neighborhood')}
            </label>
            
            {location ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-xl border border-green-200">
                <CheckCircle size={20} className="text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Location set successfully</p>
                  <p className="text-xs opacity-80">Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}</p>
                </div>
                <button 
                  type="button" 
                  onClick={fetchLocation}
                  className="text-xs font-semibold text-green-700 hover:text-green-800 underline"
                >
                  Update
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={fetchLocation}
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-blue-300 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-70 font-medium"
              >
                {isLocating ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <MapPin size={20} />
                )}
                {isLocating 
                  ? t('profileSetup.locating', 'Finding your location...') 
                  : t('profileSetup.fetchLocation', 'Use my current location')}
              </button>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {t('profileSetup.locationDesc', 'Your location is used to show relevant local issues and civic updates.')}
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !location || !name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isSubmitting && <Loader2 className="animate-spin" size={18} />}
            {t('profileSetup.submit', 'Complete Setup')}
          </button>
        </form>
      </div>
    </div>
  );
}
