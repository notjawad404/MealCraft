import { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { authApi } from '../lib/api';
import PageHeader from './common/PageHeader';
import Field from './auth/Field';
import FormAlert from './common/FormAlert';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateProfile({ name, email }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Name is required.';
  if (!email.trim()) errors.email = 'Email address is required.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
  return errors;
}

function validatePassword({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};
  if (!currentPassword) errors.currentPassword = 'Enter your current password.';
  if (!newPassword) errors.newPassword = 'Enter a new password.';
  else if (newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters long.';
  if (!confirmPassword) errors.confirmPassword = 'Confirm your new password.';
  else if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

export default function Profile() {
  const { user, token, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'security'

  // Profile Form state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileFormError, setProfileFormError] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profilePending, setProfilePending] = useState(false);
  const [memberSince, setMemberSince] = useState(null);

  // Password Form state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordFormError, setPasswordFormError] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordPending, setPasswordPending] = useState(false);

  // Fetch complete profile on mount
  useEffect(() => {
    let ignore = false;
    if (!token) return;

    authApi
      .getProfile(token)
      .then((data) => {
        if (!ignore && data?.user) {
          setProfileData({
            name: data.user.name || '',
            email: data.user.email || '',
          });
          if (data.user.createdAt) {
            setMemberSince(
              new Date(data.user.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              }),
            );
          }
        }
      })
      .catch(() => {
        /* fallback to auth context user */
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  // Sync state if user changes in context
  useEffect(() => {
    if (user) {
      setProfileData((prev) => ({
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const updateProfileField = (key) => (e) => {
    setProfileData((prev) => ({ ...prev, [key]: e.target.value }));
    setProfileErrors((prev) => ({ ...prev, [key]: undefined }));
    setProfileSuccessMsg('');
    setProfileFormError('');
  };

  const updatePasswordField = (key) => (e) => {
    setPasswords((prev) => ({ ...prev, [key]: e.target.value }));
    setPasswordErrors((prev) => ({ ...prev, [key]: undefined }));
    setPasswordSuccessMsg('');
    setPasswordFormError('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileFormError('');
    setProfileSuccessMsg('');

    const nextErrors = validateProfile(profileData);
    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setProfilePending(true);
    try {
      await updateProfile({
        name: profileData.name.trim(),
        email: profileData.email.trim(),
      });
      setProfileSuccessMsg('Your profile details have been updated successfully.');
    } catch (err) {
      setProfileFormError(err.message || 'Failed to update profile.');
    } finally {
      setProfilePending(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordFormError('');
    setPasswordSuccessMsg('');

    const nextErrors = validatePassword(passwords);
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPasswordPending(true);
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswordSuccessMsg('Your password has been changed successfully.');
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setPasswordFormError(err.message || 'Failed to update password.');
    } finally {
      setPasswordPending(false);
    }
  };

  const userInitial = (user?.name || profileData.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="shell space-y-8 py-10">
      <PageHeader
        eyebrow="Account Settings"
        title="Your Profile"
        subtitle="Manage your personal details and security credentials."
      />

      {/* User Info Overview Banner */}
      <div className="flex flex-col gap-6 rounded-3xl border border-ink-200/80 bg-paper-50 p-6 shadow-card dark:border-night-700 dark:bg-night-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-ember-600 font-display text-2xl font-bold text-paper-50 shadow-md dark:bg-ember-500">
            {userInitial}
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-paper-50">
              {profileData.name || user?.name}
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              {profileData.email || user?.email}
            </p>
          </div>
        </div>

        {memberSince && (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-ink-200 bg-white/60 px-4 py-2 text-xs font-medium text-ink-600 dark:border-night-700 dark:bg-night-800/80 dark:text-ink-300">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-ember-600 dark:text-ember-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Member since {memberSince}
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-ink-200 dark:border-night-700" role="tablist" aria-label="Profile Sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'personal'}
          aria-controls="tabpanel-personal"
          id="tab-personal"
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2.5 border-b-2 px-6 py-3.5 text-sm font-semibold transition-colors ${
            activeTab === 'personal'
              ? 'border-ember-600 text-ember-700 dark:border-ember-400 dark:text-ember-300'
              : 'border-transparent text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-paper-50'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Personal Details
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'security'}
          aria-controls="tabpanel-security"
          id="tab-security"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2.5 border-b-2 px-6 py-3.5 text-sm font-semibold transition-colors ${
            activeTab === 'security'
              ? 'border-ember-600 text-ember-700 dark:border-ember-400 dark:text-ember-300'
              : 'border-transparent text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-paper-50'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Change Password
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {/* Personal Details Tab */}
        {activeTab === 'personal' && (
          <div
            role="tabpanel"
            id="tabpanel-personal"
            aria-labelledby="tab-personal"
            className="max-w-2xl animate-fade-in"
          >
            <div className="flex flex-col justify-between rounded-3xl border border-ink-200/80 bg-paper-50 p-8 shadow-card dark:border-night-700 dark:bg-night-900">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ember-100 text-ember-700 dark:bg-ember-950/60 dark:text-ember-300">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-paper-50">
                      Personal Details
                    </h3>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      Update your display name and contact email address.
                    </p>
                  </div>
                </div>

                <form id="profile-form" onSubmit={handleProfileSubmit} noValidate className="space-y-5">
                  <FormAlert>{profileFormError}</FormAlert>

                  {profileSuccessMsg && (
                    <div
                      role="status"
                      className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {profileSuccessMsg}
                    </div>
                  )}

                  <Field
                    id="profile-name"
                    label="Display Name"
                    type="text"
                    autoComplete="name"
                    placeholder="Chef Jane Doe"
                    value={profileData.name}
                    onChange={updateProfileField('name')}
                    error={profileErrors.name}
                  />

                  <Field
                    id="profile-email"
                    label="Email Address"
                    type="email"
                    autoComplete="email"
                    placeholder="jane@example.com"
                    value={profileData.email}
                    onChange={updateProfileField('email')}
                    error={profileErrors.email}
                  />
                </form>
              </div>

              <div className="mt-8 border-t border-ink-200/60 pt-6 dark:border-night-700">
                <button
                  type="submit"
                  form="profile-form"
                  disabled={profilePending}
                  className="btn-primary w-full sm:w-auto px-8 disabled:pointer-events-none disabled:opacity-60"
                >
                  {profilePending ? 'Saving changes…' : 'Save Profile Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Password Tab */}
        {activeTab === 'security' && (
          <div
            role="tabpanel"
            id="tabpanel-security"
            aria-labelledby="tab-security"
            className="max-w-2xl animate-fade-in"
          >
            <div className="flex flex-col justify-between rounded-3xl border border-ink-200/80 bg-paper-50 p-8 shadow-card dark:border-night-700 dark:bg-night-900">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ember-100 text-ember-700 dark:bg-ember-950/60 dark:text-ember-300">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-paper-50">
                      Update Password
                    </h3>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      Ensure your account is using a strong, unique password.
                    </p>
                  </div>
                </div>

                <form id="password-form" onSubmit={handlePasswordSubmit} noValidate className="space-y-5">
                  <FormAlert>{passwordFormError}</FormAlert>

                  {passwordSuccessMsg && (
                    <div
                      role="status"
                      className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {passwordSuccessMsg}
                    </div>
                  )}

                  <Field
                    id="currentPassword"
                    label="Current Password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={passwords.currentPassword}
                    onChange={updatePasswordField('currentPassword')}
                    error={passwordErrors.currentPassword}
                  />

                  <Field
                    id="newPassword"
                    label="New Password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={passwords.newPassword}
                    onChange={updatePasswordField('newPassword')}
                    error={passwordErrors.newPassword}
                    hint="Must be at least 8 characters long."
                  />

                  <Field
                    id="confirmPassword"
                    label="Confirm New Password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={passwords.confirmPassword}
                    onChange={updatePasswordField('confirmPassword')}
                    error={passwordErrors.confirmPassword}
                  />
                </form>
              </div>

              <div className="mt-8 border-t border-ink-200/60 pt-6 dark:border-night-700">
                <button
                  type="submit"
                  form="password-form"
                  disabled={passwordPending}
                  className="btn-primary w-full sm:w-auto px-8 disabled:pointer-events-none disabled:opacity-60"
                >
                  {passwordPending ? 'Updating password…' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
