"use client";

import axios from "axios";
import qs from "query-string";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BarChart3, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";

const formSchema = z.object({
  question: z.string().trim().min(1).max(180),
  options: z.array(z.object({
    value: z.string().trim().min(1).max(80),
  })).min(2).max(8),
});

const POLL_MESSAGE_PREFIX = "arcnest-poll:v1:";

export const MessagePollModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const isModalOpen = isOpen && type === "messagePoll";
  const { apiUrl, query } = data;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: "",
      options: [
        { value: "" },
        { value: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const endpoint = qs.stringifyUrl({
      url: apiUrl || "",
      query,
    });

    const payload = {
      kind: "poll",
      question: values.question.trim(),
      options: values.options.map((option) => option.value.trim()),
    };

    await axios.post(endpoint, {
      content: `${POLL_MESSAGE_PREFIX}${JSON.stringify(payload)}`,
    });

    router.refresh();
    handleClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden bg-white p-0 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Create poll
          </DialogTitle>
          <DialogDescription>
            Ask a question and add answer options.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder="Poll question"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`options.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            disabled={isLoading}
                            placeholder={`Option ${index + 1}`}
                            className="h-10"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <button
                    type="button"
                    disabled={fields.length <= 2 || isLoading}
                    onClick={() => remove(index)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {fields.length < 8 && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => append({ value: "" })}
                className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-indigo-500 transition hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
              >
                <Plus className="h-4 w-4" />
                Add option
              </button>
            )}

            <DialogFooter className="-mx-6 mt-2 bg-zinc-50 px-6 py-4 dark:bg-zinc-900">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" disabled={isLoading}>
                Create poll
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
