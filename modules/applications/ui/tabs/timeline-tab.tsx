"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { useConfirm } from "@/hooks/use-confirm";
import { EVENT_TYPE_CONFIG } from "@/modules/applications/constants";
import { EventFormDialog } from "@/modules/events/ui/event-form-dialog";
import { useTRPC } from "@/trpc/client";

export function TimelineTab({ applicationId }: { applicationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [ConfirmDialog, confirm] = useConfirm();

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
      onError: (error) =>
        toast.add({ type: "error", title: "Failed to delete", description: error.message }),
    })
  );

  async function handleDelete(eventId: string) {
    const ok = await confirm({
      title: "Delete event",
      message: "This event will be permanently deleted. This can't be undone.",
    });
    if (ok) remove.mutate({ id: eventId });
  }

  const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return (
    <>
      <ConfirmDialog />
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Timeline</h2>
            <p className="text-sm text-muted-foreground">Key dates for this application.</p>
          </div>
          <AddEventSheet applicationId={applicationId} />
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
                    Add interviews, follow-ups, and deadlines to build this application&apos;s
                    timeline.
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
                <li key={event.id} className="relative mb-8">
                  <span className="absolute -left-7.75 flex size-3 items-center justify-center rounded-full border border-border bg-background">
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
                          onClick={() => handleDelete(event.id)}
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
    </>
  );
}

function AddEventSheet({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="sm" />}>
        <Plus />
        Add event
      </SheetTrigger>
      <SheetContent side="right" className="data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add event</SheetTitle>
          <SheetDescription>Add a date to this application&apos;s timeline.</SheetDescription>
        </SheetHeader>
        <EventFormDialog applicationId={applicationId} onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
