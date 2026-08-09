"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { cn } from "@/lib/utils";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EVENT_TYPE_CONFIG } from "@/modules/applications/constants";

import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";

export function TimelineTab({ applicationId }: { applicationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const eventsQuery = useQuery(trpc.events.getManyForApplication.queryOptions({ applicationId }));
  const events = eventsQuery.data ?? [];

  const remove = useMutation(
    trpc.events.remove.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Event deleted" });
        queryClient.invalidateQueries({
          queryKey: trpc.events.getManyForApplication.queryKey({ applicationId }),
        });
        queryClient.invalidateQueries({ queryKey: trpc.events.getManyForMonth.queryKey() });
      },
      onError: (error) => toast.add({ type: "error", title: "Failed to delete", description: error.message }),
    })
  );

  const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Timeline</h2>
          <p className="text-sm text-muted-foreground">Key dates for this application.</p>
        </div>
        <EventDialog applicationId={applicationId} />
      </div>

      {eventsQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No events yet</EmptyTitle>
                <EmptyDescription>
                  Add interviews, follow-ups, and deadlines to build this application&apos;s timeline.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <ol className="relative border-l border-border pl-6">
          {sorted.map((event) => {
            const config = EVENT_TYPE_CONFIG[event.type];
            return (
              <li key={event.id} className="relative mb-8 last:mb-0">
                <span className="absolute -left-[31px] flex size-3 items-center justify-center rounded-full border border-border bg-background">
                  <span className="size-1.5 rounded-full bg-primary" />
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{event.title}</span>
                      <Badge className={cn(config.className)}>{config.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(event.startTime, "MMM d, yyyy · h:mm a")}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => remove.mutate({ id: event.id })}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function EventDialog({ applicationId }: { applicationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"offer" | "application" | "interview" | "followup" | "deadline" | "other">("other");
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);

  const create = useMutation(
    trpc.events.create.mutationOptions({
      onSuccess: () => {
        toast.add({ type: "success", title: "Event added" });
        setOpen(false);
        setTitle("");
        setDescription("");
        setType("other");
        setStartTime(undefined);
        queryClient.invalidateQueries({
          queryKey: trpc.events.getManyForApplication.queryKey({ applicationId }),
        });
        queryClient.invalidateQueries({ queryKey: trpc.events.getManyForMonth.queryKey() });
      },
      onError: (error) => toast.add({ type: "error", title: "Failed to add", description: error.message }),
    })
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        Add event
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add event</DialogTitle>
          <DialogDescription>Add a date to this application&apos;s timeline.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
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
            <Select value={type} onValueChange={(v) => setType((v ?? "other") as typeof type)}>
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
              <PopoverTrigger
                render={
                  <Button variant="outline" className="justify-start text-left font-normal" />
                }
              >
                <CalendarIcon className="mr-2 size-4" />
                {startTime ? (
                  format(startTime, "PPP 'at' p")
                ) : (
                  <span className="text-muted-foreground">Pick a date and time</span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startTime}
                  onSelect={(date) => {
                    if (date) {
                      const now = new Date();
                      date.setHours(now.getHours(), now.getMinutes(), 0, 0);
                      setStartTime(date);
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
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                startTime &&
                create.mutate({
                  applicationId,
                  title,
                  description: description || null,
                  type,
                  startTime,
                })
              }
              disabled={create.isPending || !title.trim() || !startTime}
            >
              {create.isPending && <Loader2 className="animate-spin" />}
              Add event
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
