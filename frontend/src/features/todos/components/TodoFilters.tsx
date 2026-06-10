import { zodResolver } from "@hookform/resolvers/zod";
import { Search, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tag, TodoFilters as TodoFiltersValue } from "../api/todos";

const filterSchema = z.object({
  keyword: z.string().max(200).optional(),
  status: z.enum(["", "active", "completed"]),
  tagId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

type FilterFormData = z.infer<typeof filterSchema>;

interface TodoFiltersProps {
  filters: TodoFiltersValue;
  tags: Tag[];
  onChange: (filters: TodoFiltersValue) => void;
}

export function TodoFilters({ filters, tags, onChange }: TodoFiltersProps) {
  const { register, handleSubmit, reset } = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    values: {
      keyword: filters.keyword || "",
      status: filters.status || "",
      tagId: filters.tagId || "",
      dateFrom: filters.dateFrom || "",
      dateTo: filters.dateTo || "",
    },
  });

  const onSubmit = (data: FilterFormData) => {
    onChange({
      keyword: data.keyword?.trim() || undefined,
      status: data.status || undefined,
      tagId: data.tagId || undefined,
      dateFrom: data.dateFrom || undefined,
      dateTo: data.dateTo || undefined,
    });
  };

  const clearFilters = () => {
    const emptyFilters: FilterFormData = {
      keyword: "",
      status: "",
      tagId: "",
      dateFrom: "",
      dateTo: "",
    };
    reset(emptyFilters);
    onChange({});
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-[1.4fr_0.9fr_0.9fr_1fr_1fr_auto]">
      <div className="space-y-1.5">
        <Label htmlFor="todo-keyword">Keyword</Label>
        <Input id="todo-keyword" placeholder="Search todos" {...register("keyword")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="todo-status">Status</Label>
        <select
          id="todo-status"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          {...register("status")}
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="todo-tag">Tag</Label>
        <select
          id="todo-tag"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          {...register("tagId")}
        >
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="todo-date-from">From</Label>
        <Input id="todo-date-from" type="date" {...register("dateFrom")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="todo-date-to">To</Label>
        <Input id="todo-date-to" type="date" {...register("dateTo")} />
      </div>

      <div className="flex items-end gap-2">
        <Button type="submit" size="icon-sm" aria-label="Apply filters">
          <Search className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon-sm" aria-label="Clear filters" onClick={clearFilters}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
