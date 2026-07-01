import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/FeedbackContext';
import PageTitle from '../components/PageTitle';
import TextInput from '../components/TextInput';
import SelectInput from '../components/SelectInput';
import ToggleSwitch from '../components/ToggleSwitch';
import { PrimaryButton } from '../components/Button';

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ full_name: '', email: '' });
  const [prefs, setPrefs] = useState({ timezone: 'UTC', language: 'en' });
  const [notifs, setNotifs] = useState({ email_alerts: false, push_notifications: false, weekly_digest: false });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/settings/profile').then(data => {
      setProfile({ full_name: data.full_name || '', email: data.email || '' });
    }).catch(() => {});
    api.get('/settings/preferences').then(data => {
      if (data && typeof data === 'object') {
        setPrefs(p => ({ ...p, ...data }));
        if (data.notifications) setNotifs(n => ({ ...n, ...data.notifications }));
      }
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/settings/profile', profile);
      await api.put('/settings/preferences', { ...prefs, notifications: notifs });
      toast.success('Settings saved');
    } catch (err) { toast.error(err.message || 'Failed to save settings'); }
    setSaving(false);
  }

  return (
    <div>
      <PageTitle>Settings</PageTitle>

      <div className="settings-grid">
        {/* Profile */}
        <div className="card settings-card">
          <h3 className="settings-card-title">Profile</h3>
          <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
            <TextInput label="Full Name" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
            <TextInput label="Email" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#5a6573', marginBottom: 6, display: 'block' }}>Role</label>
              <input className="input" value={user?.role || ''} disabled style={{ opacity: 0.6 }} />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="card settings-card">
          <h3 className="settings-card-title">Preferences</h3>
          <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
            <SelectInput
              label="Timezone"
              value={prefs.timezone}
              onChange={e => setPrefs(p => ({ ...p, timezone: e.target.value }))}
              options={[
                { value: 'UTC', label: 'UTC' },
                { value: 'Pacific/Honolulu', label: 'Honolulu (HST, UTC-10)' },
                { value: 'America/Anchorage', label: 'Anchorage (AKST, UTC-9)' },
                { value: 'America/Los_Angeles', label: 'Los Angeles (PST, UTC-8)' },
                { value: 'America/Denver', label: 'Denver (MST, UTC-7)' },
                { value: 'America/Chicago', label: 'Chicago (CST, UTC-6)' },
                { value: 'America/New_York', label: 'New York (EST, UTC-5)' },
                { value: 'America/Sao_Paulo', label: 'São Paulo (BRT, UTC-3)' },
                { value: 'Europe/London', label: 'London (GMT, UTC+0)' },
                { value: 'Europe/Berlin', label: 'Berlin (CET, UTC+1)' },
                { value: 'Europe/Moscow', label: 'Moscow (MSK, UTC+3)' },
                { value: 'Asia/Jerusalem', label: 'Israel (IST, UTC+2)' },
                { value: 'Asia/Dubai', label: 'Dubai (GST, UTC+4)' },
                { value: 'Asia/Kolkata', label: 'India (IST, UTC+5:30)' },
                { value: 'Asia/Shanghai', label: 'Shanghai (CST, UTC+8)' },
                { value: 'Asia/Tokyo', label: 'Tokyo (JST, UTC+9)' },
                { value: 'Australia/Sydney', label: 'Sydney (AEST, UTC+10)' },
              ]}
            />
            <SelectInput
              label="Language"
              value={prefs.language}
              onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Español' },
                { value: 'fr', label: 'Français' },
                { value: 'he', label: 'עברית' },
              ]}
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="card settings-card">
          <h3 className="settings-card-title">Notifications</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Saved with your preferences · delivery coming soon
          </p>
          <div className="settings-toggle-row">
            <div>
              <div style={{ fontWeight: 500 }}>Email alerts</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Receive sensor status changes via email</div>
            </div>
            <ToggleSwitch checked={notifs.email_alerts} onChange={(v) => setNotifs(n => ({ ...n, email_alerts: v }))} />
          </div>
          <div className="settings-toggle-row">
            <div>
              <div style={{ fontWeight: 500 }}>Push notifications</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Browser notifications for critical events</div>
            </div>
            <ToggleSwitch checked={notifs.push_notifications} onChange={(v) => setNotifs(n => ({ ...n, push_notifications: v }))} />
          </div>
          <div className="settings-toggle-row">
            <div>
              <div style={{ fontWeight: 500 }}>Weekly digest</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Summary of activity sent every Monday</div>
            </div>
            <ToggleSwitch checked={notifs.weekly_digest} onChange={(v) => setNotifs(n => ({ ...n, weekly_digest: v }))} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <PrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </PrimaryButton>
      </div>
    </div>
  );
}
