const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getBoards: () => request('/boards'),
  createBoard: (name) => request('/boards', { method: 'POST', body: JSON.stringify({ name }) }),
  createColumn: (boardId, name) =>
    request('/columns', { method: 'POST', body: JSON.stringify({ board_id: boardId, name }) }),
  getBoard: (id) => request(`/boards/${id}`),
  createTask: (task) => request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id, updates) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  moveTask: (id, columnId) =>
    request(`/tasks/${id}/move`, { method: 'PATCH', body: JSON.stringify({ column_id: columnId }) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};
