import { useState, type FormEvent } from 'react';
import { createTaskSchema, DESCRIPTION_MAX, TITLE_MAX, type CreateTaskInput } from '@app/shared';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TaskFormProps {
  initial?: { title: string; description: string | null };
  submitLabel: string;
  onSubmit(input: CreateTaskInput): Promise<void>;
  /** Compact = the "add task" bar; full = inside the edit dialog. */
  variant?: 'compact' | 'full';
  autoFocus?: boolean;
}

export function TaskForm({
  initial,
  submitLabel,
  onSubmit,
  variant = 'compact',
  autoFocus,
}: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [showDescription, setShowDescription] = useState(variant === 'full');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = createTaskSchema.safeParse({ title, description });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid task');
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onSubmit(parsed.data);
      if (variant === 'compact') {
        setTitle('');
        setDescription('');
        setShowDescription(false);
      }
    } catch {
      // Caller shows a toast; keep the input so nothing is lost.
    } finally {
      setPending(false);
    }
  }

  const titleId = variant === 'full' ? 'edit-title' : 'new-title';
  const descriptionId = variant === 'full' ? 'edit-description' : 'new-description';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor={titleId} className={variant === 'compact' ? 'sr-only' : 'mb-1.5'}>
            Title
          </Label>
          <Input
            id={titleId}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            maxLength={TITLE_MAX}
            autoFocus={autoFocus}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${titleId}-error` : undefined}
            className="h-11"
          />
        </div>
        {variant === 'compact' && (
          <Button type="submit" disabled={pending} className="h-11 shrink-0 px-4">
            <Plus aria-hidden />
            <span className="sr-only sm:not-sr-only">{submitLabel}</span>
          </Button>
        )}
      </div>

      {error && (
        <p id={`${titleId}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {showDescription ? (
        <div>
          <Label htmlFor={descriptionId} className={variant === 'compact' ? 'sr-only' : 'mb-1.5'}>
            Description
          </Label>
          <Textarea
            id={descriptionId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details (optional)"
            maxLength={DESCRIPTION_MAX}
            rows={3}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDescription(true)}
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          + Add description
        </button>
      )}

      {variant === 'full' && (
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
