import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import AuthLayout from './AuthLayout';
import Field from './Field';
import FormAlert from '../common/FormAlert';
import SubmitButton from '../common/SubmitButton';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'That does not look like a valid email.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Where the route guard sent us from, so the journey resumes after signing in.
  const redirectTo = location.state?.from?.pathname || '/';

  const [values, setValues] = useState({ email: '', password: '' });
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
      await login({ email: values.email.trim(), password: values.password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.message);
      setPending(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to your cookbook"
      subtitle="Your recipes are where you left them."
      altPrompt="New here?"
      altLabel="Create an account"
      altTo="/register"
      asideTitle="The recipes you trust, waiting exactly where you put them."
      asidePoints={[
        {
          title: 'Nothing gets lost',
          body: 'No more scrolling three months back through your camera roll to find the good one.',
        },
        {
          title: 'Private stays private',
          body: 'Recipes you keep to yourself are only ever visible to you.',
        },
      ]}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormAlert>{formError}</FormAlert>

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
          autoComplete="current-password"
          placeholder="••••••••"
          value={values.password}
          onChange={update('password')}
          error={errors.password}
        />

        <SubmitButton pending={pending} pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
