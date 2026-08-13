import React, { useState } from 'react';
import TaskCard from './TaskCard.jsx';
import TaskForm from './TaskForm.jsx';

export default function Column({
  column,
  allColumns,
  priorityFilter,
  onCreateTask,
  onMoveTask,
  onDeleteTask,
  onUpdateTask,
}) {
  const [showForm, setShowForm] = useState(false);

  const visibleTasks = column.tasks.filter(
    (t) => priorityFilter === 'All' || t.priority === priorityFilter
  );

  return (
    <div className="column">
      <h2>
        {column.name} ({visibleTasks.length})
      </h2>
      {visibleTasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          allColumns={allColumns}
          onMove={(newColumnId) => onMoveTask(task.id, newColumnId)}
          onDelete={() => onDeleteTask(task.id)}
          onUpdate={(updates) => onUpdateTask(task.id, updates)}
        />
      ))}
      {showForm ? (
        <TaskForm
          onSubmit={async (values) => {
            await onCreateTask(column.id, values);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button className="add-task-btn" onClick={() => setShowForm(true)}>
          + Add task
        </button>
      )}
    </div>
  );
}
