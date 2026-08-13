import React, { useState } from 'react';

export default function BoardSelector({ boards, currentBoardId, onSelect, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    if (e.target.value === '__new__') {
      setCreating(true);
      return;
    }
    onSelect(Number(e.target.value));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await onCreate(name.trim());
      setName('');
      setCreating(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (creating) {
    return (
      <form onSubmit={handleCreate} className="board-create-form">
        {formError && <p className="form-error">{formError}</p>}
        <input
          autoFocus
          placeholder="New board name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="form-actions">
          <button type="submit" disabled={submitting}>Create</button>
          <button type="button" onClick={() => { setCreating(false); setFormError(null); }}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <select value={currentBoardId ?? ''} onChange={handleChange} className="board-selector">
      {boards.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
      <option value="__new__">+ New board...</option>
    </select>
  );
}
