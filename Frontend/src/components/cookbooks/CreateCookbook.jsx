import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { recipeApi, cookbookApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';

export default function CreateCookbook() {
  const { id } = useParams(); // If present, editing mode
  const { token } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [price, setPrice] = useState(0);
  const [pdfType, setPdfType] = useState('generated'); // 'generated' | 'uploaded'
  const [pdfUrl, setPdfUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // User's available recipes (public + private)
  const [userRecipes, setUserRecipes] = useState([]);

  // Selected recipes in cookbook: [{ recipe: recipeObject, order: number, customNotes: string }]
  const [selectedRecipes, setSelectedRecipes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load user's recipes and existing cookbook data if editing
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        // Load creator's recipes
        const recipeRes = await recipeApi.mine(token, { limit: 100 });
        if (isMounted && recipeRes.recipes) {
          setUserRecipes(recipeRes.recipes);
        }

        // If editing existing cookbook
        if (id) {
          const cb = await cookbookApi.get(id, { token });
          if (isMounted && cb) {
            setTitle(cb.title || '');
            setDescription(cb.description || '');
            setCoverImage(cb.coverImage || '');
            setPrice(cb.price || 0);
            setPdfType(cb.pdfType || 'generated');
            setPdfUrl(cb.pdfUrl || '');
            setIsPublished(cb.isPublished !== undefined ? cb.isPublished : true);

            if (cb.recipes) {
              const formatted = cb.recipes.map((item, idx) => ({
                recipe: item.recipe || item,
                order: idx,
                customNotes: item.customNotes || '',
              }));
              setSelectedRecipes(formatted);
            }
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (token) {
      loadData();
    }
  }, [id, token]);

  const handleAddRecipe = (recipeObj) => {
    if (selectedRecipes.some((item) => item.recipe._id === recipeObj._id)) return;
    setSelectedRecipes((prev) => [
      ...prev,
      {
        recipe: recipeObj,
        order: prev.length,
        customNotes: '',
      },
    ]);
  };

  const handleRemoveRecipe = (recipeId) => {
    setSelectedRecipes((prev) =>
      prev
        .filter((item) => item.recipe._id !== recipeId)
        .map((item, idx) => ({ ...item, order: idx }))
    );
  };

  const handleMoveRecipe = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selectedRecipes.length) return;

    const updated = [...selectedRecipes];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setSelectedRecipes(updated.map((item, idx) => ({ ...item, order: idx })));
  };

  const handleNotesChange = (recipeId, notes) => {
    setSelectedRecipes((prev) =>
      prev.map((item) =>
        item.recipe._id === recipeId ? { ...item, customNotes: notes } : item
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const recipePayload = selectedRecipes.map((item, idx) => ({
        recipe: item.recipe._id,
        order: idx,
        customNotes: item.customNotes,
      }));

      const payload = {
        title: title.trim(),
        description: description.trim(),
        coverImage,
        price: Number(price) || 0,
        pdfType,
        pdfUrl: pdfType === 'uploaded' ? pdfUrl : '',
        recipes: recipePayload,
        isPublished,
      };

      let result;
      if (id) {
        result = await cookbookApi.update(id, payload, token);
      } else {
        result = await cookbookApi.create(payload, token);
      }

      navigate(`/cookbooks/${result._id}`);
    } catch (err) {
      setError(err.message || 'Failed to save cookbook');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="shell py-12 text-center text-ink-500 dark:text-ink-400">
        Loading cookbook studio...
      </div>
    );
  }

  return (
    <div className="shell py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
          {id ? 'Edit Cookbook' : 'Create Digital Cookbook'}
        </h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
          Combine your public and private recipes into a structured PDF book with custom notes and a page index.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="surface rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-ink-900 dark:text-ink-100">1. Cookbook Information</h2>

          <div>
            <label className="label">Cookbook Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. My Favorite Mediterranean Delights"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              rows={3}
              placeholder="Give a brief summary of what's inside this cookbook collection..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Cover Image URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="label">Price (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="field"
              />
              <p className="mt-1 text-xs text-ink-500">Set 0 for a free cookbook.</p>
            </div>
          </div>
        </div>

        {/* Format Selection */}
        <div className="surface rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-ink-900 dark:text-ink-100">2. Cookbook Format</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                pdfType === 'generated'
                  ? 'border-ember-500 bg-ember-500/10 text-ember-900 dark:text-ember-200 font-semibold'
                  : 'border-ink-200 dark:border-night-700 hover:border-ink-300'
              }`}
            >
              <input
                type="radio"
                name="pdfType"
                value="generated"
                checked={pdfType === 'generated'}
                onChange={() => setPdfType('generated')}
                className="sr-only"
              />
              <div className="font-semibold text-base mb-1">📖 Auto-Generated PDF Book</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">
                Compiles your selected recipes automatically into a styled book layout with a Cover Page and Table of Contents Index.
              </div>
            </label>

            <label
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                pdfType === 'uploaded'
                  ? 'border-ember-500 bg-ember-500/10 text-ember-900 dark:text-ember-200 font-semibold'
                  : 'border-ink-200 dark:border-night-700 hover:border-ink-300'
              }`}
            >
              <input
                type="radio"
                name="pdfType"
                value="uploaded"
                checked={pdfType === 'uploaded'}
                onChange={() => setPdfType('uploaded')}
                className="sr-only"
              />
              <div className="font-semibold text-base mb-1">📄 Uploaded Custom PDF URL</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">
                Link a pre-designed custom PDF document (e.g. created on Canva or InDesign).
              </div>
            </label>
          </div>

          {pdfType === 'uploaded' && (
            <div className="pt-2">
              <label className="label">Custom PDF Direct URL</label>
              <input
                type="url"
                placeholder="https://res.cloudinary.com/.../cookbook.pdf"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                className="field"
              />
            </div>
          )}
        </div>

        {/* Recipe Selection & Ordering */}
        <div className="surface rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-ink-900 dark:text-ink-100">
                3. Select & Order Recipes ({selectedRecipes.length})
              </h2>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Add recipes, adjust their page order, and write custom cookbook notes per recipe.
              </p>
            </div>

            {/* Recipe picker dropdown */}
            <div className="w-full sm:w-64">
              <select
                className="field text-sm cursor-pointer"
                onChange={(e) => {
                  const found = userRecipes.find((r) => r._id === e.target.value);
                  if (found) handleAddRecipe(found);
                  e.target.value = '';
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  + Add from My Recipes...
                </option>
                {userRecipes.map((r) => {
                  const isSelected = selectedRecipes.some((item) => item.recipe._id === r._id);
                  return (
                    <option key={r._id} value={r._id} disabled={isSelected}>
                      {r.title} {!r.isPublic ? '(Private)' : ''} {isSelected ? '(Added)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Selected Recipe List */}
          {selectedRecipes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-300 dark:border-night-600 p-8 text-center text-sm text-ink-500">
              No recipes added to this cookbook yet. Choose a recipe from the dropdown above.
            </div>
          ) : (
            <div className="space-y-4">
              {selectedRecipes.map((item, idx) => (
                <div
                  key={item.recipe._id}
                  className="rounded-xl border border-ink-200 bg-white p-4 dark:border-night-700 dark:bg-night-900 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveRecipe(idx, -1)}
                          className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-800 disabled:opacity-30 dark:hover:bg-night-800"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedRecipes.length - 1}
                          onClick={() => handleMoveRecipe(idx, 1)}
                          className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-800 disabled:opacity-30 dark:hover:bg-night-800"
                          title="Move Down"
                        >
                          ▼
                        </button>
                      </div>

                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ember-100 text-xs font-bold text-ember-800 dark:bg-ember-900/50 dark:text-ember-300">
                        {idx + 1}
                      </span>

                      <div>
                        <div className="font-semibold text-ink-900 dark:text-ink-50 flex items-center gap-2">
                          {item.recipe.title}
                          {!item.recipe.isPublic && (
                            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 dark:bg-night-800 dark:text-gray-300">
                              Private
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-ink-500">
                          Appears on <strong className="text-ember-600 dark:text-ember-400">Page {idx + 3}</strong> of PDF
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRecipe(item.recipe._id)}
                      className="text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Custom Notes Field */}
                  <div>
                    <input
                      type="text"
                      placeholder="Add custom recipe note/tip for this cookbook (e.g. 'My grandmother's secret twist...')"
                      value={item.customNotes}
                      onChange={(e) => handleNotesChange(item.recipe._id, e.target.value)}
                      className="field py-1.5 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table of Contents Preview */}
          {selectedRecipes.length > 0 && (
            <div className="mt-6 rounded-xl bg-paper-50 p-4 dark:bg-night-800 border border-ink-200 dark:border-night-700">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">
                Page Index / Table of Contents Preview
              </h3>
              <div className="space-y-1 font-mono text-xs text-ink-700 dark:text-ink-300">
                <div className="flex justify-between border-b border-dashed border-ink-200 dark:border-night-700 pb-1">
                  <span>Cover Page</span>
                  <span>Page 1</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-ink-200 dark:border-night-700 pb-1">
                  <span>Table of Contents</span>
                  <span>Page 2</span>
                </div>
                {selectedRecipes.map((item, idx) => (
                  <div key={item.recipe._id} className="flex justify-between">
                    <span>
                      {idx + 1}. {item.recipe.title}
                    </span>
                    <span>Page {idx + 3}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/cookbooks')}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? 'Saving Cookbook...' : id ? 'Update Cookbook' : 'Publish Cookbook'}
          </button>
        </div>
      </form>
    </div>
  );
}
