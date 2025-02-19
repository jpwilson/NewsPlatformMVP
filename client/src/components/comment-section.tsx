import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Comment, insertCommentSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function CommentSection({ articleId }: { articleId: number }) {
  const { user } = useAuth();
  const [replyToId, setReplyToId] = useState<number | null>(null);

  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: [`/api/articles/${articleId}/comments`],
  });

  const form = useForm({
    resolver: zodResolver(insertCommentSchema.omit({ articleId: true, createdAt: true })),
    defaultValues: {
      content: "",
      parentId: null,
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      const res = await apiRequest("POST", `/api/articles/${articleId}/comments`, {
        ...data,
        parentId: replyToId,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/articles/${articleId}/comments`] });
      form.reset();
      setReplyToId(null);
    },
  });

  function CommentComponent({ comment }: { comment: Comment }) {
    const isReply = comment.parentId !== null;
    
    return (
      <div className={`${isReply ? "ml-8 mt-4" : "mt-6"}`}>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">
              {new Date(comment.createdAt).toLocaleDateString()}
            </div>
            <p className="text-sm">{comment.content}</p>
            {user && !isReply && (
              <Button
                variant="link"
                size="sm"
                className="px-0 text-muted-foreground"
                onClick={() => setReplyToId(comment.id)}
              >
                Reply
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const parentComments = comments?.filter((c) => !c.parentId) || [];
  const childComments = comments?.filter((c) => c.parentId) || [];

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Comments</h2>

      {user && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => commentMutation.mutate(data))}
            className="space-y-4 mb-8"
          >
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Write a comment..."
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex items-center gap-4">
              <Button
                type="submit"
                disabled={commentMutation.isPending}
              >
                Post Comment
              </Button>
              {replyToId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setReplyToId(null)}
                >
                  Cancel Reply
                </Button>
              )}
            </div>
          </form>
        </Form>
      )}

      <div className="space-y-6">
        {parentComments.map((comment) => (
          <div key={comment.id}>
            <CommentComponent comment={comment} />
            {childComments
              .filter((c) => c.parentId === comment.id)
              .map((reply) => (
                <CommentComponent key={reply.id} comment={reply} />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
