import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { countTasks, useTaskStore, type Filter } from '@/store/task-store';

const LABELS: Record<Filter, string> = { all: 'All', active: 'Active', completed: 'Completed' };

export function TaskFilters() {
  const filter = useTaskStore((s) => s.filter);
  const setFilter = useTaskStore((s) => s.setFilter);
  const tasks = useTaskStore((s) => s.tasks);
  const counts = countTasks(tasks);

  return (
    <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
      <TabsList className="w-full sm:w-auto">
        {(Object.keys(LABELS) as Filter[]).map((key) => (
          <TabsTrigger key={key} value={key} className="flex-1 gap-1.5 sm:flex-none">
            {LABELS[key]}
            <span className="text-muted-foreground text-xs tabular-nums">{counts[key]}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
