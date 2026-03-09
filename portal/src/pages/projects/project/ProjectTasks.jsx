import t from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { updateSubmission } from '@kineticdata/react';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';

const TASKS_FIELD = 'Tasks JSON';
const FIELD_TASKS_MAN_HOURS_TOTAL = 'Project Tasks Man Hours Total';

const parseTasks = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const serializeTasks = tasks => JSON.stringify(tasks);

const createTask = text => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  text: text.trim(),
  done: false,
  estimatedHours: '',
});

export const ProjectTasks = ({ project, reloadProject }) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [saving, setSaving] = useState(false);

  const submissionTasks = project?.values?.[TASKS_FIELD] || '';

  useEffect(() => {
    setTasks(parseTasks(submissionTasks));
  }, [submissionTasks]);

  const hasChanges = useMemo(
    () => serializeTasks(tasks) !== serializeTasks(parseTasks(submissionTasks)),
    [tasks, submissionTasks],
  );

  const totalEstimatedHours = useMemo(
    () =>
      tasks.reduce((sum, task) => {
        const hours = parseFloat(task.estimatedHours);
        return sum + (Number.isFinite(hours) ? hours : 0);
      }, 0),
    [tasks],
  );

  const handleAddTask = useCallback(() => {
    const trimmed = newTask.trim();
    if (!trimmed) return;
    setTasks(current => [...current, createTask(trimmed)]);
    setNewTask('');
  }, [newTask]);

  const handleToggleTask = useCallback(taskId => {
    setTasks(current =>
      current.map(task =>
        task.id === taskId ? { ...task, done: !task.done } : task,
      ),
    );
  }, []);

  const handleUpdateHours = useCallback((taskId, hours) => {
    setTasks(current =>
      current.map(task =>
        task.id === taskId ? { ...task, estimatedHours: hours } : task,
      ),
    );
  }, []);

  const handleRemoveTask = useCallback(taskId => {
    setTasks(current => current.filter(task => task.id !== taskId));
  }, []);

  const handleSave = useCallback(async () => {
    if (!project?.id) return;
    setSaving(true);
    const result = await updateSubmission({
      id: project.id,
      values: {
        [TASKS_FIELD]: serializeTasks(tasks),
        [FIELD_TASKS_MAN_HOURS_TOTAL]: totalEstimatedHours || null,
      },
    });

    if (result?.error) {
      toastError({
        title: 'Unable to save tasks',
        description: result.error.message,
      });
    } else {
      toastSuccess({ title: 'Tasks updated.' });
      reloadProject?.();
    }

    setSaving(false);
  }, [project, tasks, totalEstimatedHours, reloadProject]);

  return (
    <div className="krounded-box border kbg-base-100 p-6">
      <div className="text-lg font-semibold">Tasks</div>
      <p className="mt-2 ktext-base-content/70">
        Create a checklist for the team.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          className="kinput kinput-bordered flex-1 min-w-[240px]"
          placeholder="Add a task..."
          value={newTask}
          onChange={event => setNewTask(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAddTask();
            }
          }}
        />
        <button
          type="button"
          className="kbtn kbtn-primary"
          onClick={handleAddTask}
          disabled={!newTask.trim()}
        >
          Add Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="mt-3 text-sm ktext-base-content/60">
          No tasks yet.
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {tasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-2 krounded-box border kbg-base-100/60 px-3 py-2"
            >
              <input
                type="checkbox"
                className="kcheckbox"
                checked={!!task.done}
                onChange={() => handleToggleTask(task.id)}
              />
              <div
                className={`flex-1 text-sm ${
                  task.done ? 'line-through ktext-base-content/50' : ''
                }`}
              >
                {task.text}
              </div>
              <input
                type="number"
                className="kinput kinput-bordered kinput-sm w-20 text-right"
                placeholder="Hrs"
                min="0"
                step="0.5"
                value={task.estimatedHours ?? ''}
                onChange={event =>
                  handleUpdateHours(task.id, event.target.value)
                }
              />
              <button
                type="button"
                className="kbtn kbtn-ghost kbtn-xs kbtn-circle"
                onClick={() => handleRemoveTask(task.id)}
                aria-label="Remove task"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mt-3 flex justify-end text-sm ktext-base-content/70">
          Estimated Total:{' '}
          <span className="ml-1 font-semibold text-base-content">
            {totalEstimatedHours} hrs
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="kbtn kbtn-primary"
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? 'Saving...' : 'Save Tasks'}
        </button>
      </div>
    </div>
  );
};

ProjectTasks.propTypes = {
  project: t.object,
  reloadProject: t.func,
};
