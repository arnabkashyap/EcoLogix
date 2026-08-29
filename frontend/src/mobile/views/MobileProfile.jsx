import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Truck,
  ShieldCheck,
  Leaf,
  Award,
  ExternalLink,
  MapPin,
  Phone,
  Search,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Save,
  Edit3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchDriverProfile, updateDriverProfile } from '../../services/api';

export default function MobileProfile({ onExit }) {
  const navigate = useNavigate();

  // Driver Personal Profile State
  const [profile, setProfile] = useState({
    name: 'John Doe',
    phone: '+91 98765 43210',
    home_city: 'Guwahati',
    home_address: 'Betkuchi ISBT Freight Terminal, Guwahati, Assam',
    home_lat: 26.1214,
    home_lng: 91.7319,
    assigned_vehicle: 'NW Tata Signa Heavy Diesel #101',
    completed_trips: 124,
    co2_saved_kg: 1402,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('John Doe');
  const [phoneInput, setPhoneInput] = useState('+91 98765 43210');

  // Address Geocoding State (Reusing Nominatim pattern from ShipmentInputForm)
  const [addressQuery, setAddressQuery] = useState('Betkuchi ISBT Freight Terminal, Guwahati');
  const [resolvedLocation, setResolvedLocation] = useState({
    city: 'Guwahati',
    address: 'Betkuchi ISBT Freight Terminal, Guwahati, Assam',
    lat: 26.1214,
    lng: 91.7319,
  });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Fetch live driver profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await fetchDriverProfile().catch(() => null);
        if (data) {
          setProfile(data);
          setNameInput(data.name || 'John Doe');
          setPhoneInput(data.phone || '+91 98765 43210');
          setAddressQuery(data.home_address || data.home_city || 'Guwahati Hub');
          setResolvedLocation({
            city: data.home_city || 'Guwahati',
            address: data.home_address || 'Guwahati Hub',
            lat: data.home_lat || 26.1214,
            lng: data.home_lng || 91.7319,
          });
        }
      } catch (err) {
        console.warn('Driver profile fetch notice:', err);
      }
    }
    loadProfile();
  }, []);

  // Geocode address using OpenStreetMap Nominatim
  const handleGeocodeAddress = async (e) => {
    if (e) e.preventDefault();
    if (!addressQuery.trim()) return;

    setIsGeocoding(true);
    setGeocodeError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        const cityName = first.display_name.split(',')[0].trim();
        setResolvedLocation({
          city: cityName,
          address: first.display_name,
          lat: lat,
          lng: lon,
        });
      } else {
        setGeocodeError('Location not found. Try entering a city or depot landmark.');
      }
    } catch (err) {
      setGeocodeError('Geocoding service unavailable.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Save profile updates via PATCH /api/v1/driver/profile
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg('');
    try {
      const payload = {
        name: nameInput.trim(),
        phone: phoneInput.trim(),
        home_city: resolvedLocation.city,
        home_address: resolvedLocation.address,
        home_lat: resolvedLocation.lat,
        home_lng: resolvedLocation.lng,
      };

      const res = await updateDriverProfile(payload).catch(() => null);
      if (res?.profile) {
        setProfile(res.profile);
      } else {
        setProfile((prev) => ({
          ...prev,
          ...payload,
        }));
      }

      setSaveSuccessMsg('Personal details & home base updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.warn('Failed to update driver profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            My Details & ID
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
            EcoLogix Driver — Heavy Truck
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> ID Verified
        </span>
      </div>

      {/* Success Notification Banner */}
      <AnimatePresence>
        {saveSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Overview Card */}
      <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-6 shadow-xl text-center space-y-3 relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-2xl font-bold mx-auto shadow-lg shadow-emerald-500/10">
          <User className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-100">{profile.name}</h3>
          <p className="text-xs text-slate-400 font-mono font-semibold">
            Driver ID: {profile.id || 'DRV-001'} • Class 1 Heavy Licence
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" /> Green Driver — Gold Badge
          </span>
        </div>
      </div>

      {/* Editable Driver Personal Information & Registered Home Base */}
      <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" /> Personal Details & Home Base
          </h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel' : 'Edit Details'}</span>
          </button>
        </div>

        {isEditing ? (
          /* Editable Form Mode */
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            {/* Full Name Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" /> Full Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Driver full name"
                className="w-full bg-[#0B0E14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            {/* Phone Number Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> Contact Phone
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-[#0B0E14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                required
              />
            </div>

            {/* Registered / Home Base Location Input with Geocoding */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Registered Home Base Depot / City
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  placeholder="e.g. Betkuchi Terminal, Guwahati Hub, Dispur..."
                  className="w-full bg-[#0B0E14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleGeocodeAddress}
                  disabled={isGeocoding || !addressQuery.trim()}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
                >
                  {isGeocoding ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>{isGeocoding ? 'Locating' : 'Verify'}</span>
                </button>
              </div>

              {geocodeError && (
                <div className="text-rose-400 text-[11px] flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{geocodeError}</span>
                </div>
              )}

              {resolvedLocation && (
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Location Resolved: {resolvedLocation.city}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Lat: {resolvedLocation.lat.toFixed(4)}, Lng: {resolvedLocation.lng.toFixed(4)}
                  </p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 select-none"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Save className="w-4 h-4 text-slate-950" />
              )}
              <span>{isSaving ? 'Saving Changes...' : 'Save Details & Home Base'}</span>
            </motion.button>
          </form>
        ) : (
          /* Read-Only Summary Mode */
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60">
              <span className="text-slate-400 font-medium">Driver Name</span>
              <span className="text-slate-100 font-bold">{profile.name}</span>
            </div>
            <div className="flex justify-between items-center bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60">
              <span className="text-slate-400 font-medium">Contact Phone</span>
              <span className="text-slate-100 font-bold font-mono">{profile.phone}</span>
            </div>
            <div className="flex justify-between items-center bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60">
              <span className="text-slate-400 font-medium">Registered Home Base</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {profile.home_city || 'Guwahati Hub'}
              </span>
            </div>
            {profile.home_address && (
              <div className="bg-[#0B0E14]/40 p-2.5 rounded-xl border border-slate-800/40 text-[11px] text-slate-400 flex items-start gap-1.5">
                <span className="text-slate-500 font-mono">Address:</span>
                <span className="text-slate-300 font-medium">{profile.home_address}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Truck Details */}
      <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-400" /> My Truck
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between items-center bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 font-medium">Truck Name</span>
            <span className="text-slate-100 font-bold font-mono">
              {profile.assigned_vehicle || 'NW Tata Signa Heavy Diesel #101'}
            </span>
          </div>
          <div className="flex justify-between items-center bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 font-medium">Truck Type</span>
            <span className="text-slate-100 font-bold">Heavy Truck</span>
          </div>
          <div className="flex justify-between items-center bg-[#0B0E14]/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 font-medium">Max Load It Can Carry</span>
            <span className="text-slate-100 font-bold font-mono">18,000 kg</span>
          </div>
        </div>
      </div>

      {/* My Record */}
      <div className="bg-[#121722]/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-400" /> My Green Record
        </h3>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-[#0B0E14]/60 p-4 rounded-xl border border-slate-800/60 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Trips Done
            </span>
            <span className="text-xl font-black text-slate-100 font-mono">
              {profile.completed_trips || 124}
            </span>
          </div>
          <div className="bg-[#0B0E14]/60 p-4 rounded-xl border border-slate-800/60 space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              CO₂ Saved
            </span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              {profile.co2_saved_kg || 1402} kg
            </span>
          </div>
        </div>
      </div>

      {/* Switch to Admin */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          if (onExit) onExit();
          else navigate('/');
        }}
        className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-750 text-slate-200 border border-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg select-none"
      >
        <ExternalLink className="w-4 h-4 text-emerald-400" />
        Go to Admin Panel
      </motion.button>
    </div>
  );
}
