import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import AuthLayout from './AuthLayout';
import Field from './Field';
import FormAlert from './FormAlert';
import SubmitButton from './SubmitButton';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8; // mirrors the backend's express-validator rule

function validate({ name, email, password }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Tell us what to call you.';
  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'That does not look like a valid email.';
  if (!password) errors.password = 'Choose a password.';
  else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || '/';

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  const update = (key) => (e) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.message);
      setPending(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Create an account"
      title="Start your cookbook"
      subtitle="One sign-up, and every recipe you add follows you everywhere."
      altPrompt="Already have an account?"
      altLabel="Sign in"
      altTo="/login"
      asideTitle="Write it down once. Cook it for years."
      asidePoints={[
        {
          title: 'Two minutes to your first recipe',
          body: 'Start with the one you already know by heart — it is the one you will reach for most.',
        },
        {
          title: 'Yours to edit or delete',
          body: 'Every recipe stays tied to your account. Nobody else can change what you wrote.',
        },
      ]}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormAlert>{formError}</FormAlert>

        <Field
          id="name"
          label="Name"
          autoComplete="name"
          placeholder="User"
          value={values.name}
          onChange={update('name')}
          error={errors.name}
        />

        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={update('email')}
          error={errors.email}
        />

        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          value={values.password}
          onChange={update('password')}
          error={errors.password}
        />

        <SubmitButton pending={pending} pendingLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
