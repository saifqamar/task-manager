import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { filterTasks, useTaskStore } from '@/store/task-store';
import { TaskItem } from './TaskItem';

const EMPTY_MESSAGES = {
  all: 'No tasks yet. Add your first one above.',
  active: 'Nothing left to do. Nice work!',
  completed: 'No completed tasks yet.',
} as const;

export function TaskList() {
  const tasks = useTaskStore((s) => s.tasks);
  const filter = useTaskStore((s) => s.filter);
  const status = useTaskStore((s) => s.status);
  const error = useTaskStore((s) => s.error);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading tasks">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[70px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div role="alert" className="rounded-lg border border-dashed p-8 text-center">
        <p className="font-medium">Couldn't load tasks</p>
        <p className="text-muted-foreground mt-1 text-sm">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => void fetchTasks()}>
          Retry
        </Button>
      </div>
    );
  }

  const visible = filterTasks(tasks, filter);
  if (visible.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center rounded-lg border border-dashed p-10 text-center">
        <ClipboardList className="mb-3 size-8 opacity-60" aria-hidden />
        <p className="text-sm">{EMPTY_MESSAGES[filter]}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Tasks">
      {visible.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}
