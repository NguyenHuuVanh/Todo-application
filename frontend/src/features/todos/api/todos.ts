import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface TodoListResponse {
  items: Todo[];
  total: number;
  page: number;
  size: number;
}

interface CreateTodoRequest {
  title: string;
  description?: string;
}

interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface TodoFilters {
  status?: "active" | "completed" | "";
  tagId?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface CreateTagRequest {
  name: string;
  color?: string | null;
}

interface UpdateTagRequest {
  name?: string;
  color?: string | null;
}

interface BulkStatusRequest {
  todoIds: string[];
  completed: boolean;
}

const TODOS_QUERY_KEY = ["todos"] as const;
const TAGS_QUERY_KEY = ["tags"] as const;

function normalizeFilters(filters: TodoFilters = {}) {
  return {
    status: filters.status || undefined,
    tagId: filters.tagId || undefined,
    keyword: filters.keyword?.trim() || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };
}

const todosQueryKey = (page: number, size: number, filters: TodoFilters = {}) => [
  ...TODOS_QUERY_KEY,
  { page, size, ...normalizeFilters(filters) },
] as const;

type TodoListSnapshot = Array<[readonly unknown[], TodoListResponse | undefined]>;

function getTodoListSnapshots(queryClient: QueryClient): TodoListSnapshot {
  return queryClient.getQueriesData<TodoListResponse>({
    queryKey: TODOS_QUERY_KEY,
  });
}

function updateTodoLists(
  queryClient: QueryClient,
  updater: (list: TodoListResponse) => TodoListResponse
) {
  queryClient.setQueriesData<TodoListResponse>(
    { queryKey: TODOS_QUERY_KEY },
    (current) => (current ? updater(current) : current)
  );
}

function restoreTodoListSnapshots(
  queryClient: QueryClient,
  snapshots?: TodoListSnapshot
) {
  snapshots?.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
}

export function useTodos(
  page: number = 1,
  size: number = 10,
  filters: TodoFilters = {}
) {
  const normalizedFilters = normalizeFilters(filters);

  return useQuery({
    queryKey: todosQueryKey(page, size, normalizedFilters),
    queryFn: async (): Promise<TodoListResponse> => {
      const response = await api.get("/todos", {
        params: {
          page,
          page_size: size,
          status: normalizedFilters.status,
          tag_id: normalizedFilters.tagId,
          keyword: normalizedFilters.keyword,
          date_from: normalizedFilters.dateFrom || undefined,
          date_to: normalizedFilters.dateTo || undefined,
        },
      });
      return response.data;
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: async (): Promise<Tag[]> => {
      const response = await api.get("/tags");
      return response.data;
    },
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTodoRequest): Promise<Todo> => {
      const response = await api.post("/todos", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
      toast.success("Todo created successfully!");
    },
    onError: () => {
      toast.error("Failed to create todo");
    },
  });
}


export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTodoRequest;
    }): Promise<Todo> => {
      const response = await api.put(`/todos/${id}`, data);
      return response.data;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: TODOS_QUERY_KEY });

      const previousTodos = getTodoListSnapshots(queryClient);

      updateTodoLists(queryClient, (current) => ({
        ...current,
        items: current.items.map((todo) =>
          todo.id === id ? { ...todo, ...data } : todo
        ),
      }));

      return { previousTodos };
    },
    onSuccess: (updatedTodo) => {
      updateTodoLists(queryClient, (current) => ({
        ...current,
        items: current.items.map((todo) =>
          todo.id === updatedTodo.id ? updatedTodo : todo
        ),
      }));
    },
    onError: (_err, _vars, context) => {
      restoreTodoListSnapshots(queryClient, context?.previousTodos);
      toast.error("Failed to update todo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/todos/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TODOS_QUERY_KEY });

      const previousTodos = getTodoListSnapshots(queryClient);

      updateTodoLists(queryClient, (current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
        items: current.items.filter((todo) => todo.id !== id),
      }));

      return { previousTodos };
    },
    onSuccess: () => {
      toast.success("Todo deleted successfully!");
    },
    onError: (_err, _id, context) => {
      restoreTodoListSnapshots(queryClient, context?.previousTodos);
      toast.error("Failed to delete todo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}

export function useAttachTodoTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      todoId,
      tagId,
    }: {
      todoId: string;
      tagId: string;
    }): Promise<Todo> => {
      const response = await api.post(`/todos/${todoId}/tags`, { tag_id: tagId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to attach tag");
    },
  });
}

export function useDetachTodoTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      todoId,
      tagId,
    }: {
      todoId: string;
      tagId: string;
    }): Promise<Todo> => {
      const response = await api.delete(`/todos/${todoId}/tags/${tagId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to remove tag");
    },
  });
}

export function useBulkUpdateTodoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ todoIds, completed }: BulkStatusRequest) => {
      const response = await api.patch("/todos/bulk-status", {
        todo_ids: todoIds,
        completed,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
      toast.success("Todos updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update selected todos");
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTagRequest): Promise<Tag> => {
      const response = await api.post("/tags", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
      toast.success("Tag created successfully!");
    },
    onError: () => {
      toast.error("Failed to create tag");
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTagRequest;
    }): Promise<Tag> => {
      const response = await api.patch(`/tags/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
      toast.success("Tag updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update tag");
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
      toast.success("Tag deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete tag");
    },
  });
}

export function useToggleTodo() {
  const updateTodo = useUpdateTodo();

  return {
    mutate: (todo: Todo) => {
      updateTodo.mutate({
        id: todo.id,
        data: { completed: !todo.completed },
      });
    },
    isPending: updateTodo.isPending,
  };
}
