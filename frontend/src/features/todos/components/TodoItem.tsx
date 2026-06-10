import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  CircleMinus,
  CirclePlus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { Tag, Todo } from "../api/todos";

interface TodoItemProps {
  todo: Todo;
  index: number;
  tags: Tag[];
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onAttachTag: (todoId: string, tagId: string) => void;
  onDetachTag: (todoId: string, tagId: string) => void;
}

export function TodoItem({
  todo,
  tags,
  selected,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onAttachTag,
  onDetachTag,
}: TodoItemProps) {
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const availableTags = tags.filter(
    (tag) => !todo.tags.some((todoTag) => todoTag.id === tag.id)
  );

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
      <Checkbox
        id={`todo-${todo.id}`}
        checked={todo.completed}
        onCheckedChange={() => onToggle(todo)}
        className="mt-1"
      />

      <div className="flex-1 min-w-0">
        <label
          htmlFor={`todo-${todo.id}`}
          className={`text-sm font-medium cursor-pointer ${
            todo.completed ? "line-through text-muted-foreground" : ""
          }`}
        >
          {todo.title}
        </label>
        {todo.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {todo.description}
          </p>
        )}

        {todo.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {todo.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
                style={{
                  borderColor: tag.color || undefined,
                  color: tag.color || undefined,
                }}
              >
                {tag.name}
                <button
                  type="button"
                  aria-label={`Remove ${tag.name} from ${todo.title}`}
                  onClick={() => onDetachTag(todo.id, tag.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        {availableTags.length > 0 && (
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Attach tag to ${todo.title}`}
              aria-expanded={tagMenuOpen}
              className="h-8 min-w-32 justify-between px-2 text-xs"
              onClick={() => setTagMenuOpen((open) => !open)}
            >
              Add tag
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>

            {tagMenuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      onAttachTag(todo.id, tag.id);
                      setTagMenuOpen(false);
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border"
                      style={{
                        backgroundColor: tag.color || "transparent",
                        borderColor: tag.color || undefined,
                      }}
                    />
                    <span className="truncate">{tag.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          className={`flex items-center gap-1 transition-opacity ${
            selected ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
          }`}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={selected ? `Remove ${todo.title} from bulk selection` : `Select ${todo.title} for bulk action`}
            aria-pressed={selected}
            title={selected ? "Remove from selection" : "Select for bulk action"}
            className={`h-8 w-8 ${selected ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => onSelect(todo.id, !selected)}
          >
            {selected ? (
              <CircleMinus className="h-3.5 w-3.5" />
            ) : (
              <CirclePlus className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(todo)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(todo.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
