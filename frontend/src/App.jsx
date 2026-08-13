import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import Column from './components/Column.jsx';
import BoardSelector from './components/BoardSelector.jsx';
import AddColumnForm from './components/AddColumnForm.jsx';

export default function App() {
  const [boards, setBoards] = useState([]);
  const [boardId, setBoardId] = useState(null);
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('All');

  async function loadBoards(selectId) {
    try {
      setError(null);
      const list = await api.getBoards();
      setBoards(list);
      // Prefer the id we were just told to select; otherwise keep current;
      // otherwise fall back to the first board.
      const nextId = selectId ?? boardId ?? list[0]?.id ?? null;
      setBoardId(nextId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadBoard(id) {
    if (!id) return;
    try {
      setError(null);
      const data = await api.getBoard(id);
      setBoard(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadBoards();
  }, []);

  useEffect(() => {
    if (boardId) loadBoard(boardId);
  }, [boardId]);

  // These six intentionally do NOT catch: a failure here is a form-level
  // validation problem (duplicate name, bad priority, etc.), not an app-level
  // failure. Letting it throw means the component that called it — the form,
  // the card — can show the message inline and let the user try again,
  // instead of the whole board getting replaced by the global error banner.
  // loadBoards/loadBoard above are different: those really are "the app
  // couldn't load," so they keep their own catch -> setError.

  async function handleCreateBoard(name) {
    const newBoard = await api.createBoard(name);
    await loadBoards(newBoard.id);
  }

  async function handleCreateColumn(name) {
    await api.createColumn(boardId, name);
    await loadBoard(boardId);
  }

  async function handleCreateTask(columnId, values) {
    await api.createTask({ column_id: columnId, ...values });
    await loadBoard(boardId);
  }

  async function handleMoveTask(taskId, newColumnId) {
    await api.moveTask(taskId, newColumnId);
    await loadBoard(boardId);
  }

  async function handleDeleteTask(taskId) {
    await api.deleteTask(taskId);
    await loadBoard(boardId);
  }

  async function handleUpdateTask(taskId, updates) {
    await api.updateTask(taskId, updates);
    await loadBoard(boardId);
  }

  if (error) {
    return (
      <div className="error-banner">
        <p>Something went wrong: {error}</p>
        <button onClick={() => loadBoard(boardId)}>Retry</button>
      </div>
    );
  }

  if (!board) return <p style={{ padding: 20 }}>Loading board...</p>;

  return (
    <div className="app">
      <header>
        <h1>{board.name}</h1>
        <div className="header-controls">
          <BoardSelector
            boards={boards}
            currentBoardId={boardId}
            onSelect={setBoardId}
            onCreate={handleCreateBoard}
          />
          <label>
            Filter by priority:{' '}
            <select
              className="priority-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option>All</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
        </div>
      </header>
      <div className="board">
        {board.columns.map((col) => (
          <Column
            key={col.id}
            column={col}
            allColumns={board.columns}
            priorityFilter={priorityFilter}
            onCreateTask={handleCreateTask}
            onMoveTask={handleMoveTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTask}
          />
        ))}
        <div className="add-column-wrapper">
          <AddColumnForm onCreate={handleCreateColumn} />
        </div>
      </div>
    </div>
  );
}
