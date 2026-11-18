import { describe, expect, it } from 'vitest';
import { createTaskSchema, updateTaskSchema } from './task.schema.js';

describe('createTaskSchema', () => {
  it('trims title and normalises empty description to null', () => {
    expect(createTaskSchema.parse({ title: '  Buy milk ', description: '  ' })).toEqual({
      title: 'Buy milk',
      description: null,
    });
  });

  it('rejects blank titles', () => {
    expect(createTaskSchema.safeParse({ title: '   ' }).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(createTaskSchema.safeParse({ title: 'x', completed: true }).success).toBe(false);
  });
});

describe('updateTaskSchema', () => {
  it('requires at least one field', () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a completed-only update', () => {
    expect(updateTaskSchema.parse({ completed: true })).toEqual({ completed: true });
  });
});
