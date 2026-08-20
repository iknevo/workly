"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMinutes, format } from "date-fns";
import { CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import { TimePicker } from "@/components/ui/time-picker";
import { toast } from "@/components/ui/toast";

import type { events } from "@/db/schema";
import { insertEventSchema } from "@/db/schema";
import { EVENT_TYPE_CONFIG } from "@/modules/applications/constants";
import { useTRPC } from "@/trpc/client";

const eventFormSchema = insertEventSchema.omit({ userId: true });
type EventFormValues = z.infer<typeof eventFormSchema>;
type Event = typeof events.$inferSelect;

function toTimeString(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function mergeTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const merged = new Date(date);
  merged.setHours(hours, minutes, 0, 0);
  return merged;
}

export function EventFormDialog({
  applicationId,
  initial,
  defaultStartTime,
  defaultEndTime,
  onClose,
}: {
  applicationId?: string;
  initial?: Event;
  defaultStartTime?: Date;
  defaultEndTime?: Date;
  onClose?: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isEditing = initial != null;
  const linkedApplicationId = initial?.applicationId ?? applicationId ?? null;

  const applicationsQuery = useQuery(trpc.applications.getMany.queryOptions());
  const applications = applicationsQuery.data ?? [];

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      applicationId: linkedApplicationId,
      title: initial?.title ?? "",
      type: initial?.type ?? "interview",
      startTime: initial?.startTime ?? defaultStartTime,
      endTime: initial?.endTime ?? defaultEndTime ?? null,
      description: initial?.description ?? "",
    },
  });

  const [title, startTime] = useWatch({ control: form.control, name: ["title", "startTime"] });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.events.getManyForMonth.queryKey() });
    const applicationIds = new Set([linkedApplicationId, form.getValues("applicationId")]);
    applicationIds.forEach((applicationId) => {
      if (applicationId) {
        queryClient.invalidateQueries({
          queryKey: trpc.events.getManyForApplication.queryKey({ applicationId }),
        });
      }
    });
  };

  const create = useMutation(
    trpc.events.create.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Event added" });
        invalidate();
        onClose?.();
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to add event", description: error.message }),
    })
  );

  const update = useMutation(
    trpc.events.update.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Event updated" });
        invalidate();
        onClose?.();
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to update event", description: error.message }),
    })
  );

  const remove = useMutation(
    trpc.events.remove.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Event deleted" });
        invalidate();
        onClose?.();
      },
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to delete event", description: error.message }),
    })
  );

  useEffect(() => {
    form.reset({
      applicationId: initial?.applicationId ?? applicationId ?? null,
      title: initial?.title ?? "",
      type: initial?.type ?? "interview",
      startTime: initial?.startTime ?? defaultStartTime,
      endTime: initial?.endTime ?? defaultEndTime ?? null,
      description: initial?.description ?? "",
    });
  }, [applicationId, defaultEndTime, defaultStartTime, form, initial]);

  const typeItems = Object.entries(EVENT_TYPE_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  }));
  const applicationItems = applications.map((app) => ({
    value: app.id,
    label: `${app.company} - ${app.position}`,
  }));

  const onSubmit = (values: EventFormValues) => {
    if (isEditing && initial) {
      update.mutate({ ...values, id: initial.id });
    } else {
      create.mutate(values);
    }
  };

  return (
    <form
      id="event-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
        {!applicationId && (
          <Controller
            name="applicationId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Link to application</FieldLabel>
                <Combobox
                  items={applicationItems}
                  value={applicationItems.find((item) => item.value === field.value) ?? null}
                  onValueChange={(item) => field.onChange(item?.value ?? null)}
                  autoHighlight
                >
                  <ComboboxInput placeholder="Search applications..." showClear />
                  <ComboboxContent>
                    <ComboboxEmpty>No applications found.</ComboboxEmpty>
                    <ComboboxList>
                      {(item: (typeof applicationItems)[number]) => (
                        <ComboboxItem key={item.value} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
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
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Starts</FieldLabel>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        className="min-w-0 flex-1 justify-start text-left font-normal"
                      />
                    }
                  >
                    <CalendarIcon className="mr-2 size-4 shrink-0" />
                    {field.value ? (
                      <span className="truncate">{format(field.value, "PPP")}</span>
                    ) : (
                      <span className="truncate text-muted-foreground">Pick a date</span>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={(date) => {
                        if (date) {
                          field.onChange(
                            mergeTime(date, field.value ? toTimeString(field.value) : "09:00")
                          );
                        }
                      }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                <TimePicker
                  value={field.value ? toTimeString(field.value) : ""}
                  onChange={(time) => field.onChange(mergeTime(field.value ?? new Date(), time))}
                  className="w-30"
                />
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="endTime"
          control={form.control}
          render={({ field, fieldState }) => {
            const value = field.value;
            const enabled = value != null;
            return (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="event-end-time"
                    checked={enabled}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        field.onChange(addMinutes(startTime ?? new Date(), 60));
                      } else {
                        field.onChange(null);
                      }
                    }}
                  />
                  <FieldLabel htmlFor="event-end-time">End time</FieldLabel>
                </div>
                {enabled && value && (
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            className="min-w-0 flex-1 justify-start text-left font-normal"
                          />
                        }
                      >
                        <CalendarIcon className="mr-2 size-4 shrink-0" />
                        <span className="truncate">{format(value, "PPP")}</span>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={value}
                          onSelect={(date) => {
                            if (date) field.onChange(mergeTime(date, toTimeString(value)));
                          }}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <TimePicker
                      value={toTimeString(value)}
                      onChange={(time) => field.onChange(mergeTime(value, time))}
                      className="w-30"
                    />
                  </div>
                )}
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            );
          }}
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
      </div>

      <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
        {isEditing && (
          <Button
            variant="ghost"
            type="button"
            className="mr-auto text-destructive hover:text-destructive"
            onClick={() => initial && remove.mutate({ id: initial.id })}
            disabled={remove.isPending}
          >
            {remove.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Delete
          </Button>
        )}
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={create.isPending || update.isPending || !title.trim() || !startTime}
        >
          {(create.isPending || update.isPending) && <Loader2 className="animate-spin" />}
          {isEditing ? "Save changes" : "Add event"}
        </Button>
      </div>
    </form>
  );
}
