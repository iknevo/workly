"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { insertEventSchema } from "@/db/schema";
import { EVENT_TYPE_CONFIG } from "@/modules/applications/constants";
import { useTRPC } from "@/trpc/client";

const eventFormSchema = insertEventSchema.omit({ userId: true });
type EventFormValues = z.infer<typeof eventFormSchema>;

export function EventFormDialog({
  applicationId,
  onClose,
}: {
  applicationId?: string;
  onClose?: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const applicationsQuery = useQuery(trpc.applications.getMany.queryOptions());
  const applications = applicationsQuery.data ?? [];

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "interview",
      startTime: undefined,
      applicationId: applicationId ?? null,
    },
  });

  const [title, startTime] = useWatch({ control: form.control, name: ["title", "startTime"] });

  const create = useMutation(
    trpc.events.create.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Event added" });
        queryClient.invalidateQueries({ queryKey: trpc.events.getManyForMonth.queryKey() });
        if (applicationId) {
          queryClient.invalidateQueries({
            queryKey: trpc.events.getManyForApplication.queryKey({ applicationId }),
          });
        }
        onClose?.();
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to add event", description: error.message }),
    })
  );

  const typeItems = Object.entries(EVENT_TYPE_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  }));
  const applicationItems = applications.map((app) => ({
    value: app.id,
    label: `${app.company} — ${app.position}`,
  }));

  const onSubmit = (values: EventFormValues) => create.mutate(values);

  return (
    <form id="event-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {!applicationId && (
        <Controller
          name="applicationId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Link to application</FieldLabel>
              <Select
                name={field.name}
                value={field.value ?? "none"}
                onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                items={applicationItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No application" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="none">No application</SelectItem>
                  {applicationItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      )}

      <Controller
        name="title"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="event-title">Title</FieldLabel>
            <Input {...field} id="event-title" placeholder="Phone screen with recruiter" />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="type"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Type</FieldLabel>
            <Select
              name={field.name}
              value={field.value ?? "other"}
              onValueChange={field.onChange}
              items={typeItems}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {typeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="startTime"
        control={form.control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Date and time</FieldLabel>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  />
                }
              >
                <CalendarIcon className="mr-2 size-4" />
                {field.value ? (
                  format(field.value, "PPP 'at' p")
                ) : (
                  <span className="text-muted-foreground">Pick a date and time</span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ?? undefined}
                  onSelect={(date) => {
                    if (date) {
                      const now = new Date();
                      date.setHours(now.getHours(), now.getMinutes(), 0, 0);
                      field.onChange(date);
                    }
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </Field>
        )}
      />

      <Controller
        name="description"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="event-description">Description</FieldLabel>
            <Textarea
              {...field}
              id="event-description"
              value={field.value ?? ""}
              placeholder="Zoom link, interviewer name..."
              rows={3}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending || !title.trim() || !startTime}>
          {create.isPending && <Loader2 className="animate-spin" />}
          Add event
        </Button>
      </div>
    </form>
  );
}
