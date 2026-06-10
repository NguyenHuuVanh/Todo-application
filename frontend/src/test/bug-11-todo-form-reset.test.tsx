/**
 * BUG-11: Dong form tao todo khong reset draft nhap do
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { TodoForm } from "@/features/todos/components/TodoForm";

vi.mock("@/features/todos/api/todos", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/todos/api/todos")>();
  return {
    ...actual,
    useCreateTodo: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateTodo: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

function FormHarness() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <TodoForm
        mode="create"
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("BUG-11: create TodoForm resets draft on close", () => {
  it("clears entered values after cancel and reopen", async () => {
    const user = userEvent.setup();
    render(<FormHarness />, { wrapper });

    await user.type(screen.getByLabelText("Title"), "Draft title");
    await user.type(screen.getByLabelText("Description (optional)"), "Draft detail");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.getByLabelText("Description (optional)")).toHaveValue("");
  });
});
