import { create } from 'zustand';
import type { CreateTaskInput, Task, UpdateTaskInput } from '@app/shared';
import { api, errorMessage } from '@/lib/api';
import { readStorage, writeStorage } from '@/lib/storage';

export type Filter = 'all' | 'active' | 'completed';
const FILTER_KEY = 'tasks.filter';

function initialFilter(): Filter {
  const saved = readStorage(FILTER_KEY);
  return saved === 'active' || saved === 'completed' ? saved : 'all';
}

interface TaskState {
  tasks: Task[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  filter: Filter;

  fetchTasks(): Promise<void>;
  addTask(input: CreateTaskInput): Promise<void>;
  updateTask(id: string, input: UpdateTaskInput): Promise<void>;
  toggleTask(id: string): Promise<void>;
  deleteTask(id: string): Promise<void>;
  setFilter(filter: Filter): void;
}

/**
 * Mutations reject on failure so the UI can show a toast; optimistic ones
 * restore the previous state first.
 */
export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  status: 'idle',
  error: null,
  filter: initialFilter(),

  async fetchTasks() {
    set({ status: 'loading', error: null });
    try {
      set({ tasks: await api.listTasks(), status: 'success' });
    } catch (error) {
      set({ status: 'error', error: errorMessage(error) });
    }
  },

  // Not optimistic: we need the server-generated id.
  async addTask(input) {
    const task = await api.createTask(input);
    set((state) => ({ tasks: [task, ...state.tasks] }));
  },

  async updateTask(id, input) {
    const previous = get().tasks.find((t) => t.id === id);
    if (!previous) return;

    const optimistic: Task = {
      ...previous,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() || null }),
      ...(input.completed !== undefined && { completed: input.completed }),
    };
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? optimistic : t)) }));

    try {
      const saved = await api.updateTask(id, input);
      set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? saved : t)) }));
    } catch (error) {
      set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? previous : t)) }));
      throw error;
    }
  },

  async toggleTask(id) {
    const task = get().tasks.find((t) => t.id === id);
    if (task) await get().updateTask(id, { completed: !task.completed });
  },

  async deleteTask(id) {
    const tasks = get().tasks;
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return;
    const removed = tasks[index]!;

    set({ tasks: tasks.filter((t) => t.id !== id) });
    try {
      await api.deleteTask(id);
    } catch (error) {
      set((state) => {
        const next = [...state.tasks];
        next.splice(Math.min(index, next.length), 0, removed);
        return { tasks: next };
      });
      throw error;
    }
  },

  setFilter(filter) {
    writeStorage(FILTER_KEY, filter);
    set({ filter });
  },
}));

export function filterTasks(tasks: Task[], filter: Filter): Task[] {
  if (filter === 'active') return tasks.filter((t) => !t.completed);
  if (filter === 'completed') return tasks.filter((t) => t.completed);
  return tasks;
}

export function countTasks(tasks: Task[]) {
  const completed = tasks.filter((t) => t.completed).length;
  return { all: tasks.length, active: tasks.length - completed, completed };
}
