import React, { useState } from 'react';

export default function AddColumnForm({ onCreate }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await onCreate(name.trim());
      setName('');
      setAdding(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!adding) {
    return (
      <button className="add-column-btn" onClick={() => setAdding(true)}>
        + Add column
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="add-column-form">
      {formError && <p className="form-error">{formError}</p>}
      <input
        autoFocus
        placeholder="Column name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="form-actions">
        <button type="submit" disabled={submitting}>Add</button>
        <button type="button" onClick={() => { setAdding(false); setFormError(null); }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
