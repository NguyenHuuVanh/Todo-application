import { useState } from "react";
import { TodoItem } from "./TodoItem";
import { TodoForm } from "./TodoForm";
import type { Tag, Todo } from "../api/todos";
import {
  useAttachTodoTag,
  useDeleteTodo,
  useDetachTodoTag,
  useToggleTodo,
} from "../api/todos";

interface TodoListProps {
  todos: Todo[];
  tags: Tag[];
  selectedTodoIds: string[];
  onSelectTodo: (id: string, selected: boolean) => void;
}

export function TodoList({
  todos,
  tags,
  selectedTodoIds,
  onSelectTodo,
}: TodoListProps) {
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const deleteTodo = useDeleteTodo();
  const toggleTodo = useToggleTodo();
  const attachTodoTag = useAttachTodoTag();
  const detachTodoTag = useDetachTodoTag();

  const handleToggle = (todo: Todo) => {
    toggleTodo.mutate(todo);
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
  };

  const handleDelete = (id: string) => {
    deleteTodo.mutate(id);
  };

  const handleAttachTag = (todoId: string, tagId: string) => {
    attachTodoTag.mutate({ todoId, tagId });
  };

  const handleDetachTag = (todoId: string, tagId: string) => {
    detachTodoTag.mutate({ todoId, tagId });
  };

  if (todos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No todos yet</p>
        <p className="text-sm mt-1">Create your first todo to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {todos.map((todo, index) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            index={index}
            tags={tags}
            selected={selectedTodoIds.includes(todo.id)}
            onSelect={onSelectTodo}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAttachTag={handleAttachTag}
            onDetachTag={handleDetachTag}
          />
        ))}
      </div>

      {editingTodo && (
        <TodoForm
          key={editingTodo.id}
          mode="edit"
          todo={editingTodo}
          open={!!editingTodo}
          onClose={() => setEditingTodo(null)}
        />
      )}
    </>
  );
}
