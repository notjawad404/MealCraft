import { useState } from 'react';
import {
  ALLERGEN_OPTIONS,
  COUNTRY_SUGGESTIONS,
  DIET_OPTIONS,
  MAX_ALLERGENS,
  MAX_CALORIES,
  MAX_COUNTRIES,
  MAX_NUTRIENTS,
  MAX_REGIONS,
  MAX_SERVINGS,
  MEAL_TYPE_OPTIONS,
  NUTRIENT_OPTIONS,
  REGION_OPTIONS,
  allergenLabel,
  findDietConflict,
  nutrientLabel,
} from '../../lib/recipes';
import { PROVIDER_LABELS, parseVideoUrl } from '../../lib/video';
import FormAlert from '../common/FormAlert';
import SubmitButton from '../common/SubmitButton';
import ChipPicker from './ChipPicker';
import ImageUpload from './ImageUpload';
import IngredientsInput from './IngredientsInput';
import NutritionInput from './NutritionInput';
import VideoPlayer from './VideoPlayer';

const MAX_TITLE = 120;
const MAX_MINUTES = 2880;

const emptyRecipe = {
  title: '',
  ingredients: [''],
  instructions: '',
  time: '',
  servings: '',
  mealTypes: [],
  regions: [],
  countries: [],
  allergens: [],
  diets: [],
  calories: '',
  nutrients: [],
  videoUrl: '',
  // `image` is the stored URL; `photo` is a newly picked Blob, uploaded on save.
  image: '',
  photo: null,
  isPublic: true,
};

/** A whole number, null when empty, NaN when unparsable. */
const wholeNumber = (value) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isInteger(number) ? number : NaN;
};

/** Form rows to API rows: labels become slugs, blank rows are dropped. */
const packNutrients = (rows) =>
  rows
    .filter((row) => row.name.trim() && String(row.amount).trim())
    .map((row) => {
      const name = row.name.trim().toLowerCase();
      const known = NUTRIENT_OPTIONS.find(
        (option) => option.value === name || option.label.toLowerCase() === name,
      );
      return { name: known ? known.value : name, amount: Number(row.amount), unit: row.unit };
    });

/** And back again, for an edit. */
const unpackNutrients = (nutrients = []) =>
  nutrients.map(({ name, amount, unit }) => ({
    name: nutrientLabel(name),
    amount: String(amount),
    unit,
  }));

function validate(values) {
  const { title, ingredients, instructions, time, servings, calories, videoUrl } = values;
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

  const portions = wholeNumber(servings);
  if (Number.isNaN(portions) || portions < 1) errors.servings = 'A whole number of servings.';
  else if (portions > MAX_SERVINGS) errors.servings = 'That is a lot of servings — check the number.';

  const kcal = wholeNumber(calories);
  if (Number.isNaN(kcal) || kcal < 0) errors.calories = 'A whole number of calories, per serving.';
  else if (kcal > MAX_CALORIES) errors.calories = 'That is higher than a day of eating — check it.';

  const rows = packNutrients(values.nutrients);
  if (rows.length > MAX_NUTRIENTS) {
    errors.nutrients = `Up to ${MAX_NUTRIENTS} nutrients.`;
  } else if (values.nutrients.some((row) => row.name.trim() && !String(row.amount).trim())) {
    errors.nutrients = 'Every nutrient needs an amount, or remove the row.';
  } else if (rows.some((row) => !Number.isFinite(row.amount) || row.amount < 0)) {
    errors.nutrients = 'Amounts have to be numbers.';
  }

  if (videoUrl.trim() && !parseVideoUrl(videoUrl)) {
    errors.videoUrl = 'Paste a YouTube, Vimeo or Dailymotion link, or a direct .mp4 or .webm file.';
  }

  const conflict = findDietConflict(values.diets, values.allergens);
  if (conflict) errors.diets = conflict;

  return errors;
}

/** Labelled wrapper for the plain inputs on this form. */
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

/** One titled group of fields. Only the first section is required. */
function Section({ title, blurb, children }) {
  return (
    <section className="space-y-8 border-t border-ink-200 pt-10 first:border-0 first:pt-0 dark:border-night-600">
      <header>
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink-900 dark:text-paper-50">
          {title}
        </h2>
        {blurb && (
          <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{blurb}</p>
        )}
      </header>
      {children}
    </section>
  );
}

/**
 * The recipe editor, shared by the add and edit pages.
 *
 * `onSubmit` receives an API-shaped payload and may throw; the thrown message
 * is surfaced in the banner and the form stays filled in.
 */
export default function RecipeForm({
  initialValues,
  onSubmit,
  submitLabel = 'Publish recipe',
  pendingLabel = 'Saving…',
}) {
  const [values, setValues] = useState(() => ({
    ...emptyRecipe,
    ...initialValues,
    ...(initialValues?.nutrients && { nutrients: unpackNutrients(initialValues.nutrients) }),
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState(false);

  const set = (key) => (value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setFromEvent = (key) => (e) => set(key)(e.target.value);

  const describe = (key) => (errors[key] ? `${key}-error` : undefined);
  const fieldClass = (key) =>
    `field ${errors[key] ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-800' : ''}`;

  const video = values.videoUrl.trim() ? parseVideoUrl(values.videoUrl) : null;

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
        ingredients: values.ingredients.map((line) => line.trim()).filter(Boolean).join('\n'),
        instructions: values.instructions.trim(),
        time: String(Number(values.time)),
        // Sent even when empty, so clearing a field on an edit clears it.
        servings: wholeNumber(values.servings),
        mealTypes: values.mealTypes,
        regions: values.regions,
        countries: values.countries,
        allergens: values.allergens,
        diets: values.diets,
        calories: wholeNumber(values.calories),
        nutrients: packNutrients(values.nutrients),
        videoUrl: values.videoUrl.trim(),
        image: values.image,
        isPublic: values.isPublic,
      }, values.photo);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-10">
      <FormAlert>{formError}</FormAlert>

      <Section title="The recipe">
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

        <div className="grid gap-6 sm:grid-cols-2">
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

          <Row
            id="servings"
            label="Servings"
            hint={errors.servings ? undefined : 'How many it feeds. Optional.'}
            error={errors.servings}
          >
            <input
              id="servings"
              name="servings"
              type="number"
              inputMode="numeric"
              min="1"
              max={MAX_SERVINGS}
              value={values.servings}
              onChange={setFromEvent('servings')}
              placeholder="4"
              aria-invalid={Boolean(errors.servings)}
              aria-describedby={errors.servings ? 'servings-error' : 'servings-hint'}
              className={fieldClass('servings')}
            />
          </Row>
        </div>

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
      </Section>

      <Section
        title="When and where"
        blurb="What meal this is for, and the cooking it belongs to. All optional."
      >
        <ChipPicker
          legend="Meal"
          options={MEAL_TYPE_OPTIONS}
          selected={values.mealTypes}
          onChange={set('mealTypes')}
          tone="ember"
          disabled={pending}
        />

        <ChipPicker
          legend="Region"
          options={REGION_OPTIONS}
          selected={values.regions}
          onChange={set('regions')}
          tone="sage"
          max={MAX_REGIONS}
          disabled={pending}
        />

        <ChipPicker
          legend="Country"
          hint="Where the dish is from. Type any country — the list is only a shortcut."
          options={[]}
          selected={values.countries}
          onChange={set('countries')}
          tone="sage"
          max={MAX_COUNTRIES}
          custom={{
            placeholder: 'Pakistan',
            addLabel: 'Add country',
            suggestions: COUNTRY_SUGGESTIONS,
            preserveCase: true,
          }}
          disabled={pending}
        />
      </Section>

      <Section
        title="Who can eat it"
        blurb="The part of a recipe people actually depend on. Say what is in it, and what it suits."
      >
        <ChipPicker
          legend="Contains"
          hint="Tick anything in the recipe. Add your own for whatever is not listed."
          options={ALLERGEN_OPTIONS}
          selected={values.allergens}
          onChange={set('allergens')}
          labelOf={allergenLabel}
          tone="ember"
          max={MAX_ALLERGENS}
          custom={{ placeholder: 'Blue cheese', addLabel: 'Add allergen' }}
          error={errors.allergens}
          disabled={pending}
        />

        <ChipPicker
          legend="Suitable for"
          hint="Only tick these if the recipe as written already qualifies."
          options={DIET_OPTIONS}
          selected={values.diets}
          onChange={set('diets')}
          tone="sage"
          error={errors.diets}
          disabled={pending}
        />
      </Section>

      <Section
        title="Per serving"
        blurb="Skip anything you are unsure of — a blank is honest, a guess is not."
      >
        <Row
          id="calories"
          label="Calories"
          hint={errors.calories ? undefined : 'Per serving, in kcal.'}
          error={errors.calories}
        >
          <div className="relative sm:max-w-[16rem]">
            <input
              id="calories"
              name="calories"
              type="number"
              inputMode="numeric"
              min="0"
              max={MAX_CALORIES}
              value={values.calories}
              onChange={setFromEvent('calories')}
              placeholder="520"
              aria-invalid={Boolean(errors.calories)}
              aria-describedby={errors.calories ? 'calories-error' : 'calories-hint'}
              className={`${fieldClass('calories')} pr-16`}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-400 dark:text-ink-500"
            >
              kcal
            </span>
          </div>
        </Row>

        <NutritionInput
          values={values.nutrients}
          onChange={set('nutrients')}
          error={errors.nutrients}
          disabled={pending}
        />
      </Section>

      <Section title="Photo and video">
        <Row
          id="videoUrl"
          label="Video link"
          hint={errors.videoUrl ? undefined : 'Optional. YouTube works best — Vimeo, Dailymotion and direct video files also play.'}
          error={errors.videoUrl}
        >
          <input
            id="videoUrl"
            name="videoUrl"
            type="url"
            value={values.videoUrl}
            onChange={setFromEvent('videoUrl')}
            placeholder="https://www.youtube.com/watch?v=…"
            aria-invalid={Boolean(errors.videoUrl)}
            aria-describedby={errors.videoUrl ? 'videoUrl-error' : 'videoUrl-hint'}
            className={fieldClass('videoUrl')}
          />

          {video && (
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-sage-700 dark:text-sage-300">
                  {PROVIDER_LABELS[video.provider]} video recognised.
                </span>
                <button
                  type="button"
                  onClick={() => setPreview((open) => !open)}
                  className="text-sm font-semibold text-ember-700 underline-offset-4 hover:underline dark:text-ember-300"
                >
                  {preview ? 'Hide preview' : 'Preview it'}
                </button>
              </div>

              {video.provider !== 'youtube' && (
                <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                  It will play here. A YouTube link would also bring captions,
                  quality settings and chapters with it.
                </p>
              )}

              {preview && (
                <div className="mt-3 max-w-xl">
                  <VideoPlayer url={video.url} title={`Preview of ${values.title || 'the recipe video'}`} />
                </div>
              )}
            </div>
          )}
        </Row>

        <ImageUpload
          file={values.photo}
          url={values.image}
          onChange={({ file, url }) => setValues((prev) => ({ ...prev, photo: file, image: url }))}
          disabled={pending}
        />
      </Section>

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
