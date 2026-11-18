import { useEffect } from 'react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskList } from '@/components/tasks/TaskList';
import { WeatherWidget } from '@/components/weather/WeatherWidget';
import { errorMessage } from '@/lib/api';
import { useTaskStore } from '@/store/task-store';

export default function App() {
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const addTask = useTaskStore((s) => s.addTask);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  return (
    <div className="min-h-dvh">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground text-sm">Plan it, do it, tick it off.</p>
          </div>
          <WeatherWidget />
        </header>

        <section aria-label="Add a task" className="mb-6">
          <TaskForm
            submitLabel="Add task"
            onSubmit={async (input) => {
              try {
                await addTask(input);
              } catch (error) {
                toast.error(`Couldn't add task: ${errorMessage(error)}`);
                throw error;
              }
            }}
          />
        </section>

        <div className="mb-4">
          <TaskFilters />
        </div>

        <TaskList />
      </main>
      <Toaster position="bottom-center" richColors />
    </div>
  );
}
