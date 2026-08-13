import React, { useState } from 'react';

export default function TaskCard({ task, allColumns, onMove, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [cardError, setCardError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setCardError(null);
    setBusy(true);
    try {
      await onUpdate({ title: title.trim(), description, priority });
      setEditing(false);
    } catch (err) {
      setCardError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(newColumnId) {
    setCardError(null);
    try {
      await onMove(newColumnId);
    } catch (err) {
      setCardError(err.message);
    }
  }

  async function handleDelete() {
    setCardError(null);
    try {
      await onDelete();
    } catch (err) {
      setCardError(err.message);
    }
  }

  if (editing) {
    return (
      <div className="task-card editing">
        {cardError && <p className="form-error">{cardError}</p>}
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
        <div className="form-actions">
          <button onClick={save} disabled={busy}>Save</button>
          <button onClick={() => { setEditing(false); setCardError(null); }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-card">
      {cardError && <p className="form-error">{cardError}</p>}
      <div className="task-card-top">
        <strong>{task.title}</strong>
        <span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
      </div>
      {task.description && <p>{task.description}</p>}
      <select value={task.column_id} onChange={(e) => handleMove(Number(e.target.value))}>
        {allColumns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="form-actions">
        <button onClick={() => setEditing(true)}>Edit</button>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
}
