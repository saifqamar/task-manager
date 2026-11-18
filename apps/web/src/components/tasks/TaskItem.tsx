import { useState } from 'react';
import type { Task } from '@app/shared';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/task-store';
import { DeleteTaskDialog } from './DeleteTaskDialog';
import { EditTaskDialog } from './EditTaskDialog';

export function TaskItem({ task }: { task: Task }) {
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const checkboxId = `task-${task.id}`;

  async function handleToggle() {
    try {
      await toggleTask(task.id);
    } catch (error) {
      toast.error(`Couldn't update task: ${errorMessage(error)}`);
    }
  }

  return (
    <li className="bg-card group flex items-start gap-3 rounded-lg border p-3 shadow-xs">
      <div className="flex h-11 w-6 shrink-0 items-center justify-center">
        <Checkbox
          id={checkboxId}
          checked={task.completed}
          onCheckedChange={handleToggle}
          className="size-5"
        />
      </div>

      <div className="min-w-0 flex-1 py-2.5">
        <label
          htmlFor={checkboxId}
          className={cn(
            'block cursor-pointer leading-snug font-medium break-words',
            task.completed && 'text-muted-foreground line-through',
          )}
        >
          {task.title}
        </label>
        {task.description && (
          <p
            className={cn(
              'text-muted-foreground mt-1 text-sm break-words whitespace-pre-line',
              task.completed && 'line-through opacity-70',
            )}
          >
            {task.description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-0.5 sm:opacity-60 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={`Edit task ${task.title}`}
          onClick={() => setEditing(true)}
        >
          <Pencil aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:text-destructive size-11"
          aria-label={`Delete task ${task.title}`}
          onClick={() => setDeleting(true)}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>

      <EditTaskDialog task={task} open={editing} onOpenChange={setEditing} />
      <DeleteTaskDialog task={task} open={deleting} onOpenChange={setDeleting} />
    </li>
  );
}
