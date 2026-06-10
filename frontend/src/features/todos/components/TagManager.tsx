import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tag } from "../api/todos";
import { useCreateTag, useDeleteTag, useUpdateTag } from "../api/todos";
import { tagSchema, type TagFormData } from "../schemas/todo";

interface TagManagerProps {
  tags: Tag[];
}

export function TagManager({ tags }: TagManagerProps) {
  const createTag = useCreateTag();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: { name: "", color: "#2563eb" },
  });

  const onSubmit = (data: TagFormData) => {
    createTag.mutate(
      { name: data.name, color: data.color || null },
      {
        onSuccess: () => reset({ name: "", color: "#2563eb" }),
      }
    );
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-[1fr_9rem_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="tag-name">Tag name</Label>
          <Input id="tag-name" placeholder="Work" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tag-color">Color</Label>
          <Input id="tag-color" type="color" className="px-2" {...register("color")} />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="icon-sm" aria-label="Create tag" disabled={createTag.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet</p>
        ) : (
          tags.map((tag) => <TagRow key={tag.id} tag={tag} />)
        )}
      </div>
    </div>
  );
}

function TagRow({ tag }: { tag: Tag }) {
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    values: { name: tag.name, color: tag.color || "#2563eb" },
  });

  const onSubmit = (data: TagFormData) => {
    updateTag.mutate({
      id: tag.id,
      data: { name: data.name, color: data.color || null },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2 rounded-md border p-2 md:grid-cols-[1fr_8rem_auto_auto]">
      <div>
        <Input aria-label={`Rename ${tag.name}`} {...register("name")} />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <Input aria-label={`Color for ${tag.name}`} type="color" className="px-2" {...register("color")} />
      <Button type="submit" variant="outline" size="icon-sm" aria-label={`Save ${tag.name}`} disabled={updateTag.isPending}>
        <Save className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={`Delete ${tag.name}`}
        className="text-destructive hover:text-destructive"
        disabled={deleteTag.isPending}
        onClick={() => deleteTag.mutate(tag.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  );
}
