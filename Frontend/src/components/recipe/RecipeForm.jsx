import { useState } from 'react';
import FormAlert from '../common/FormAlert';
import SubmitButton from '../common/SubmitButton';
import ImageUpload from './ImageUpload';
import IngredientsInput from './IngredientsInput';

const MAX_TITLE = 120;
const MAX_MINUTES = 2880; // two days, which covers proving, curing and brining

const emptyRecipe = {
  title: '',
  ingredients: [''],
  instructions: '',
  time: '',
  image: '',
  isPublic: true,
};

function validate({ title, ingredients, instructions, time }) {
  const errors = {};

  if (!title.trim()) errors.title = 'Give the recipe a name.';
  else if (title.trim().length > MAX_TITLE) errors.title = `Keep it under ${MAX_TITLE} characters.`;

  if (!ingredients.some((line) => line.trim())) {
    errors.ingredients = 'List at least one ingredient.';
  }

  if (!instructions.trim()) errors.instructions = 'Write down how to make it.';

  const minutes = Number(time);
  if (!time.trim()) errors.time = 'How long does it take?';
  else if (!Number.isFinite(minutes) || !Number.isInteger(minutes) || minutes < 1) {
    errors.time = 'Enter the time in whole minutes.';
  } else if (minutes > MAX_MINUTES) {
    errors.time = 'That is longer than two days — check the number.';
  }

  return errors;
}

/** Labelled wrapper shared by the plain inputs on this form. */
function Row({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-sm text-ink-500 dark:text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The recipe editor. Kept separate from the page so an edit route can reuse it
 * later with `initialValues` filled in.
 *
 * `onSubmit` receives a payload shaped for the API and may throw; the thrown
 * message is surfaced in the banner and the form stays filled in.
 */
export default function RecipeForm({
  initialValues,
  onSubmit,
  submitLabel = 'Publish recipe',
  pendingLabel = 'Saving…',
}) {
  const [values, setValues] = useState({ ...emptyRecipe, ...initialValues });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  const set = (key) => (value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setFromEvent = (key) => (e) => set(key)(e.target.value);

  const describe = (key) => (errors[key] ? `${key}-error` : undefined);
  const fieldClass = (key) =>
    `field ${errors[key] ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-800' : ''}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      await onSubmit({
        title: values.title.trim(),
        // The schema stores this as one string; one ingredient per line keeps
        // it splittable again on the way back out.
        ingredients: values.ingredients.map((line) => line.trim()).filter(Boolean).join('\n'),
        instructions: values.instructions.trim(),
        time: String(Number(values.time)),
        image: values.image || undefined,
        isPublic: values.isPublic,
      });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <FormAlert>{formError}</FormAlert>

      <Row id="title" label="Title" error={errors.title}>
        <input
          id="title"
          name="title"
          type="text"
          value={values.title}
          onChange={setFromEvent('title')}
          placeholder="Lemon & herb roast chicken"
          maxLength={MAX_TITLE}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describe('title')}
          className={fieldClass('title')}
        />
      </Row>

      <Row
        id="time"
        label="Total time"
        hint={errors.time ? undefined : 'Prep and cooking together, in minutes.'}
        error={errors.time}
      >
        <div className="relative">
          <input
            id="time"
            name="time"
            type="number"
            inputMode="numeric"
            min="1"
            max={MAX_MINUTES}
            value={values.time}
            onChange={setFromEvent('time')}
            placeholder="90"
            aria-invalid={Boolean(errors.time)}
            aria-describedby={errors.time ? 'time-error' : 'time-hint'}
            className={`${fieldClass('time')} pr-20`}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-400 dark:text-ink-500"
          >
            minutes
          </span>
        </div>
      </Row>

      <IngredientsInput
        values={values.ingredients}
        onChange={set('ingredients')}
        error={errors.ingredients}
        disabled={pending}
      />

      <Row
        id="instructions"
        label="Method"
        hint={errors.instructions ? undefined : 'One step per line reads best.'}
        error={errors.instructions}
      >
        <textarea
          id="instructions"
          name="instructions"
          rows={9}
          value={values.instructions}
          onChange={setFromEvent('instructions')}
          placeholder={'Heat the oven to 200°C.\nRub the chicken with oil, salt and thyme.\nRoast for 70 minutes, then rest for 15.'}
          aria-invalid={Boolean(errors.instructions)}
          aria-describedby={errors.instructions ? 'instructions-error' : 'instructions-hint'}
          className={`${fieldClass('instructions')} resize-y`}
        />
      </Row>

      <ImageUpload value={values.image} onChange={set('image')} disabled={pending} />

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-4 dark:border-night-600 dark:bg-night-800">
        <input
          type="checkbox"
          checked={values.isPublic}
          onChange={(e) => set('isPublic')(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-ember-600 focus:ring-ember-500 dark:border-night-600 dark:bg-night-900"
        />
        <span>
          <span className="block text-sm font-semibold text-ink-900 dark:text-paper-50">
            Publish this recipe
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-ink-500 dark:text-ink-400">
            Public recipes show up for everyone. Untick to keep it to yourself —
            you can change your mind later.
          </span>
        </span>
      </label>

      <SubmitButton pending={pending} pendingLabel={pendingLabel}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
