import { useState } from 'react';
import {
  ALLERGEN_OPTIONS,
  COUNTRY_SUGGESTIONS,
  DIET_OPTIONS,
  MEAL_TYPE_OPTIONS,
  REGION_OPTIONS,
} from '../../lib/recipes';

function AccordionSection({ title, count = 0, isOpen, onToggle, children }) {
  return (
    <div className="border-b border-ink-200/70 dark:border-night-600/80 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-4 text-left font-display text-base font-semibold text-ink-900 transition-colors hover:text-ember-600 dark:text-paper-100 dark:hover:text-ember-400"
      >
        <span className="flex items-center gap-2.5">
          <span>{title}</span>
          {count > 0 && (
            <span className="inline-flex h-5 items-center justify-center rounded-full bg-ember-500/15 px-2 text-[11px] font-bold text-ember-700 dark:bg-ember-500/25 dark:text-ember-300">
              {count}
            </span>
          )}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-5 w-5 text-ink-400 transition-transform duration-200 dark:text-ink-400 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && <div className="pb-5 pt-1">{children}</div>}
    </div>
  );
}

function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
        selected
          ? 'bg-ember-600 text-white shadow-sm dark:bg-ember-500 dark:text-night-900 font-semibold'
          : 'border border-ink-200 bg-paper-50 text-ink-700 hover:border-ink-400 hover:bg-white dark:border-night-600 dark:bg-night-900 dark:text-ink-200 dark:hover:border-night-500 dark:hover:bg-night-700'
      }`}
    >
      {children}
    </button>
  );
}

/** Accordion multi-filter drawer. */
export default function FilterAccordion({
  filters,
  onChange,
  onClear,
  activeCount = 0,
}) {
  const [openSections, setOpenSections] = useState({
    diets: true,
    mealTypes: false,
    regions: false,
    exclude: false,
    nutrition: false,
  });

  const [customExcludeInput, setCustomExcludeInput] = useState('');
  const [customCountryInput, setCustomCountryInput] = useState('');

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleArrayFilter = (key, value) => {
    const current = filters[key] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ [key]: next });
  };

  const handleAddCustomExclude = (e) => {
    e.preventDefault();
    const term = customExcludeInput.trim().toLowerCase();
    if (!term) return;
    const current = filters.exclude || [];
    if (!current.includes(term)) {
      onChange({ exclude: [...current, term] });
    }
    setCustomExcludeInput('');
  };

  const handleAddCountry = (countryName) => {
    const term = countryName.trim();
    if (!term) return;
    const current = filters.country || [];
    if (!current.includes(term)) {
      onChange({ country: [...current, term] });
    }
    setCustomCountryInput('');
  };

  const handleAddCustomCountry = (e) => {
    e.preventDefault();
    if (customCountryInput.trim()) {
      handleAddCountry(customCountryInput);
    }
  };

  const diets = filters.diet || [];
  const mealTypes = filters.mealType || [];
  const regions = filters.region || [];
  const countries = filters.country || [];
  const excludeList = filters.exclude || [];
  const maxCalories = filters.maxCalories || '';
  const maxTime = filters.maxTime || '';

  return (
    <div className="rounded-2xl border border-ink-200/90 bg-white p-5 shadow-card dark:border-night-600 dark:bg-night-800">
      <div className="flex items-center justify-between border-b border-ink-200/70 pb-4 dark:border-night-600/80">
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-ember-600 dark:text-ember-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <h3 className="font-display text-lg font-bold text-ink-900 dark:text-paper-50">
            Filters
          </h3>
          {activeCount > 0 && (
            <span className="rounded-full bg-ember-600 px-2.5 py-0.5 text-xs font-bold text-white dark:bg-ember-500 dark:text-night-900">
              {activeCount} active
            </span>
          )}
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-ember-700 hover:underline dark:text-ember-400"
          >
            Reset all
          </button>
        )}
      </div>

      <div className="divide-y divide-ink-200/70 dark:divide-night-600/80">
        {/* Section 1: Diets */}
        <AccordionSection
          title="Dietary Preferences"
          count={diets.length}
          isOpen={openSections.diets}
          onToggle={() => toggleSection('diets')}
        >
          <div className="flex flex-wrap gap-2">
            {DIET_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={diets.includes(option.value)}
                onClick={() => toggleArrayFilter('diet', option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </AccordionSection>

        {/* Section 2: Meal Type */}
        <AccordionSection
          title="Meal Type"
          count={mealTypes.length}
          isOpen={openSections.mealTypes}
          onToggle={() => toggleSection('mealTypes')}
        >
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={mealTypes.includes(option.value)}
                onClick={() => toggleArrayFilter('mealType', option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </AccordionSection>

        {/* Section 3: Region & Country */}
        <AccordionSection
          title="Region & Cuisine"
          count={regions.length + countries.length}
          isOpen={openSections.regions}
          onToggle={() => toggleSection('regions')}
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                Culinary Region
              </p>
              <div className="flex flex-wrap gap-2">
                {REGION_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    selected={regions.includes(option.value)}
                    onClick={() => toggleArrayFilter('region', option.value)}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                Country
              </p>
              <form onSubmit={handleAddCustomCountry} className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={customCountryInput}
                  onChange={(e) => setCustomCountryInput(e.target.value)}
                  placeholder="Type a country (e.g. Italy, Mexico)..."
                  className="field text-xs py-2"
                />
                <button type="submit" className="btn-ghost shrink-0 text-xs py-2 px-3">
                  Add
                </button>
              </form>

              {countries.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {countries.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ember-100 px-3 py-1 text-xs font-medium text-ember-900 dark:bg-ember-900/60 dark:text-ember-200 dark:border dark:border-ember-700/60"
                    >
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => toggleArrayFilter('country', c)}
                        className="hover:text-ember-600 dark:hover:text-ember-400"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <p className="mb-1.5 text-[11px] font-medium text-ink-500 dark:text-ink-400">
                Popular Suggestions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {COUNTRY_SUGGESTIONS.slice(0, 14).map((c) => (
                  <Chip
                    key={c}
                    selected={countries.includes(c)}
                    onClick={() => toggleArrayFilter('country', c)}
                  >
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* Section 4: Exclude List */}
        <AccordionSection
          title="Exclude / Does Not Contain"
          count={excludeList.length}
          isOpen={openSections.exclude}
          onToggle={() => toggleSection('exclude')}
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                Exclude Common Allergens
              </p>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    selected={excludeList.includes(option.value)}
                    onClick={() => toggleArrayFilter('exclude', option.value)}
                  >
                    No {option.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                Exclude Specific Ingredient
              </p>
              <form onSubmit={handleAddCustomExclude} className="flex gap-2">
                <input
                  type="text"
                  value={customExcludeInput}
                  onChange={(e) => setCustomExcludeInput(e.target.value)}
                  placeholder="e.g. mushrooms, pork, cilantro..."
                  className="field text-xs py-2"
                />
                <button type="submit" className="btn-ghost shrink-0 text-xs py-2 px-3">
                  Exclude
                </button>
              </form>

              {excludeList.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {excludeList.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 dark:border dark:border-rose-800/60"
                    >
                      <span>No {item}</span>
                      <button
                        type="button"
                        onClick={() => toggleArrayFilter('exclude', item)}
                        className="hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AccordionSection>

        {/* Section 5: Calories & Time */}
        <AccordionSection
          title="Calories & Cook Time"
          count={(maxCalories ? 1 : 0) + (maxTime ? 1 : 0)}
          isOpen={openSections.nutrition}
          onToggle={() => toggleSection('nutrition')}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                Max Calories per serving
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="5000"
                  step="50"
                  value={maxCalories}
                  onChange={(e) => onChange({ maxCalories: e.target.value })}
                  placeholder="e.g. 600"
                  className="field text-xs py-2"
                />
                <span className="text-xs text-ink-500 dark:text-ink-400 shrink-0">kcal</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[300, 500, 750, 1000].map((cal) => (
                  <Chip
                    key={cal}
                    selected={Number(maxCalories) === cal}
                    onClick={() =>
                      onChange({ maxCalories: Number(maxCalories) === cal ? '' : String(cal) })
                    }
                  >
                    Under {cal}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                Max Prep / Cook Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="1440"
                  step="5"
                  value={maxTime}
                  onChange={(e) => onChange({ maxTime: e.target.value })}
                  placeholder="e.g. 30"
                  className="field text-xs py-2"
                />
                <span className="text-xs text-ink-500 dark:text-ink-400 shrink-0">min</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[15, 30, 45, 60].map((t) => (
                  <Chip
                    key={t}
                    selected={Number(maxTime) === t}
                    onClick={() =>
                      onChange({ maxTime: Number(maxTime) === t ? '' : String(t) })
                    }
                  >
                    Under {t} m
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}
