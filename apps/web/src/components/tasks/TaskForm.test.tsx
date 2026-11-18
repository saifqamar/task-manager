import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskForm } from './TaskForm';

describe('TaskForm', () => {
  it('blocks blank titles with a message', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm submitLabel="Add task" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Title'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
  });

  it('submits trimmed input and clears the field', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskForm submitLabel="Add task" onSubmit={onSubmit} />);

    const input = screen.getByLabelText('Title');
    await userEvent.type(input, '  Buy milk {enter}');

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Buy milk', description: null });
    expect(input).toHaveValue('');
  });
});
