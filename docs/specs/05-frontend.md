# 05 — Frontend

React + Vite + TypeScript, shadcn/ui components (Tailwind), Zustand for state. Single page, no router.

## Layout

```
┌──────────────────────────────────────────────┐
│ Tasks                         [☁ London 12°C]│  header: title + WeatherWidget
├──────────────────────────────────────────────┤
│ [ What needs to be done?        ] [ Add ]    │  TaskForm (title; "+ description" toggle)
│                                              │
│ [ All 5 ] [ Active 3 ] [ Completed 2 ]       │  TaskFilters (tabs with counts)
│                                              │
│ ☐ Write README                     ✎  🗑     │  TaskItem
│   Include schema and setup                   │
│ ☑ ̶S̶e̶t̶ ̶u̶p̶ ̶C̶I̶                         ✎  🗑     │  completed: muted + strikethrough
└──────────────────────────────────────────────┘
```

- Centered container, `max-w-2xl`, padding `px-4`.
- **Mobile (< 640px)**: weather widget moves below the title; action icons are always visible (no hover-only controls); tap targets ≥ 44px.
- **Desktop**: single column, same structure, more whitespace.
- Light/dark follows system preference (Tailwind `dark:` + shadcn tokens).

## Components

| Component          | Responsibility                                            | shadcn parts                   |
| ------------------ | --------------------------------------------------------- | ------------------------------ |
| `App`              | Layout, triggers initial `fetchTasks()`                   | —                              |
| `WeatherWidget`    | Current weather for a city, change city                   | Card, Input, Popover, Skeleton |
| `TaskForm`         | Create a task; reused inside edit dialog                  | Input, Textarea, Button        |
| `TaskFilters`      | All / Active / Completed with counts                      | Tabs                           |
| `TaskList`         | Renders filtered tasks; loading/empty/error states        | Skeleton                       |
| `TaskItem`         | Checkbox toggle, title/description, edit & delete actions | Checkbox, Button               |
| `EditTaskDialog`   | Edit title/description                                    | Dialog                         |
| `DeleteTaskDialog` | Confirm deletion                                          | AlertDialog                    |
| Toaster            | Success/error notifications                               | Sonner                         |

## State (Zustand) — `store/task-store.ts`

```ts
type Filter = 'all' | 'active' | 'completed';

interface TaskState {
  tasks: Task[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  filter: Filter;

  fetchTasks(): Promise<void>;
  addTask(input: CreateTaskInput): Promise<void>;
  updateTask(id: string, input: UpdateTaskInput): Promise<void>;
  toggleTask(id: string): Promise<void>; // updateTask with !completed
  deleteTask(id: string): Promise<void>;
  setFilter(filter: Filter): void;
}
```

Derived values (filtered list, counts) are computed via selectors, not stored.

### Update strategy

| Action        | Strategy                                                                    | On failure                                  |
| ------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| Fetch         | Show skeleton while loading                                                 | Error state with "Retry" button             |
| Add           | Wait for server (needs real id); button shows pending state; prepend result | Toast error, keep form input                |
| Toggle / Edit | **Optimistic**: update local state immediately, replace with server result  | Roll back to previous task, toast error     |
| Delete        | **Optimistic**: remove immediately after confirm                            | Re-insert at original position, toast error |

The filter is persisted in `localStorage` (wrapped in try/catch).

## API client — `lib/api.ts`

- Thin `fetch` wrapper; base URL is relative `/api` (works with Vite dev proxy and Netlify proxy).
- Parses error body into `ApiError` (shared schema) and throws a typed `ApiClientError { status, code, message }`.
- Responses parsed with shared Zod schemas — catches contract drift early.
- 10 s timeout via `AbortSignal.timeout`.

## Forms & validation

- Same Zod schemas as the API (`packages/shared`) validate on submit; inline field error messages.
- Enter submits; Escape closes dialogs; title input auto-focused in edit dialog.
- Empty/whitespace titles cannot be submitted.

## Accessibility

- All inputs labelled (visually hidden labels where needed); icon buttons have `aria-label` (e.g., "Delete task Write README").
- Checkbox is a real checkbox bound to the task title.
- shadcn/Radix dialogs handle focus trapping and return focus.
- Color is never the only indicator of completion (strikethrough + checkbox).

## Folder structure

```
apps/web/src/
├─ components/
│  ├─ ui/                  # generated by shadcn
│  ├─ tasks/ (TaskForm, TaskFilters, TaskList, TaskItem, EditTaskDialog, DeleteTaskDialog)
│  └─ weather/WeatherWidget.tsx
├─ store/
│  ├─ task-store.ts
│  └─ weather-store.ts
├─ lib/ (api.ts, utils.ts)
├─ App.tsx
└─ main.tsx
```
