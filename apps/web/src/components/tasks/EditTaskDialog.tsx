import type { Task } from '@app/shared';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { errorMessage } from '@/lib/api';
import { useTaskStore } from '@/store/task-store';
import { TaskForm } from './TaskForm';

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function EditTaskDialog({ task, open, onOpenChange }: EditTaskDialogProps) {
  const updateTask = useTaskStore((s) => s.updateTask);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Update the title or description.</DialogDescription>
        </DialogHeader>
        {/* key resets the form each time the dialog opens */}
        {open && (
          <TaskForm
            key={task.updatedAt}
            variant="full"
            autoFocus
            submitLabel="Save changes"
            initial={{ title: task.title, description: task.description }}
            onSubmit={async (input) => {
              onOpenChange(false);
              try {
                await updateTask(task.id, input);
                toast.success('Task updated');
              } catch (error) {
                toast.error(`Couldn't update task: ${errorMessage(error)}`);
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
