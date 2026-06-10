import { useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  LogOut,
  Plus,
  Tags,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  type TodoFilters as TodoFiltersValue,
  useBulkUpdateTodoStatus,
  useTags,
  useTodos,
} from "../api/todos";
import { TodoList } from "./TodoList";
import { TodoForm } from "./TodoForm";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { TodoFilters } from "./TodoFilters";
import { TagManager } from "./TagManager";

export function TodoPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TodoFiltersValue>({});
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([]);
  const pageSize = 10;
  const { data, isLoading, error } = useTodos(page, pageSize, filters);
  const { data: tags = [] } = useTags();
  const bulkUpdateTodoStatus = useBulkUpdateTodoStatus();
  const { user, logout } = useAuth();
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  const handleFiltersChange = (nextFilters: TodoFiltersValue) => {
    setFilters(nextFilters);
    setPage(1);
    setSelectedTodoIds([]);
  };

  const handleSelectTodo = (id: string, selected: boolean) => {
    setSelectedTodoIds((current) =>
      selected ? [...new Set([...current, id])] : current.filter((todoId) => todoId !== id)
    );
  };

  const handleBulkStatus = (completed: boolean) => {
    bulkUpdateTodoStatus.mutate(
      { todoIds: selectedTodoIds, completed },
      {
        onSuccess: () => setSelectedTodoIds([]),
      }
    );
  };

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Todo App</h1>
            {user && (
              <p className="text-sm text-muted-foreground">{user.email}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">My Todos</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTagManager((open) => !open)}>
                <Tags className="h-4 w-4 mr-1" />
                Tags
              </Button>
              <Button size="sm" onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Todo
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="mb-4 space-y-4">
              <TodoFilters filters={filters} tags={tags} onChange={handleFiltersChange} />

              {showTagManager && (
                <div className="rounded-md border bg-muted/20 p-3">
                  <TagManager tags={tags} />
                </div>
              )}

              {selectedTodoIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedTodoIds.length} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={bulkUpdateTodoStatus.isPending}
                      onClick={() => handleBulkStatus(true)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Completed
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={bulkUpdateTodoStatus.isPending}
                      onClick={() => handleBulkStatus(false)}
                    >
                      <Circle className="h-4 w-4 mr-1" />
                      Active
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                Loading todos...
              </div>
            )}

            {error && (
              <div className="text-center py-12 text-destructive">
                Failed to load todos. Please try again.
              </div>
            )}

            {data && (
              <TodoList
                todos={data.items}
                tags={tags}
                selectedTodoIds={selectedTodoIds}
                onSelectTodo={handleSelectTodo}
              />
            )}

            {data && data.total > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                  Showing {data.items.length} of {data.total} todos
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() => {
                      setPage((current) => Math.max(1, current - 1));
                      setSelectedTodoIds([]);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Next page"
                    disabled={page >= totalPages}
                    onClick={() => {
                      setPage((current) => Math.min(totalPages, current + 1));
                      setSelectedTodoIds([]);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create Todo Dialog */}
      <TodoForm
        mode="create"
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
      />
    </div>
  );
}
