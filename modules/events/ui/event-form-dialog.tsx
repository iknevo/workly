"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import { cn } from "@/lib/utils";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EVENT_TYPE_CONFIG } from "@/modules/applications/constants";

import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

type EventType = keyof typeof EVENT_TYPE_CONFIG;

export function EventFormDialog({
  applicationId,
  onClose,
}: {
  applicationId?: string;
  onClose?: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<EventType>("interview");
  const [dateTime, setDateTime] = useState<Date | undefined>(undefined);
  const [linkedApplicationId, setLinkedApplicationId] = useState<string | undefined>(
    applicationId
  );

  const applicationsQuery = useQuery(trpc.applications.getMany.queryOptions());
  const applications = applicationsQuery.data ?? [];

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

  const canSubmit = title.trim().length > 0 && dateTime !== undefined;

  return (
    <div className="flex flex-col gap-4">
      {!applicationId && (
        <div className="flex flex-col gap-2">
          <Label>Link to application</Label>
          <Select
            value={linkedApplicationId ?? "none"}
            onValueChange={(v) => setLinkedApplicationId(v === "none" ? undefined : (v ?? undefined))}
          >
            <SelectTrigger>
              <SelectValue placeholder="No application" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No application</SelectItem>
              {applications.map((app) => (
                <SelectItem key={app.id} value={app.id}>
                  {app.company} — {app.position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="event-title">Title</Label>
        <Input
          id="event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Phone screen with recruiter"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType((v ?? "interview") as EventType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(EVENT_TYPE_CONFIG).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Date and time</Label>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" className="justify-start text-left font-normal" />}>
            <CalendarIcon className="mr-2 size-4" />
            {dateTime ? (
              format(dateTime, "PPP 'at' p")
            ) : (
              <span className="text-muted-foreground">Pick a date and time</span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTime}
              onSelect={(date) => {
                if (date) {
                  const now = new Date();
                  date.setHours(now.getHours(), now.getMinutes(), 0, 0);
                  setDateTime(date);
                }
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="event-description">Description</Label>
        <Textarea
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Zoom link, interviewer name..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() =>
            dateTime &&
            create.mutate({
              title,
              description: description || null,
              type,
              startTime: dateTime,
              applicationId: linkedApplicationId ?? null,
            })
          }
          disabled={create.isPending || !canSubmit}
        >
          {create.isPending && <Loader2 className="animate-spin" />}
          Add event
        </Button>
      </div>
    </div>
  );
}
