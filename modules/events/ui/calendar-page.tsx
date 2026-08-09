"use client";

import { useMemo, useState } from "react";
import { DayButton, DayPicker } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

import { EVENT_TYPE_CONFIG } from "@/modules/applications/constants";
import { EventFormDialog } from "@/modules/events/ui/event-form-dialog";

import { Plus } from "lucide-react";
import Link from "next/link";

export function CalendarPage() {
  const trpc = useTRPC();
  const [month, setMonth] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);

  const start = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1), [month]);
  const end = useMemo(
    () => new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999),
    [month]
  );

  const eventsQuery = useQuery(trpc.events.getManyForMonth.queryOptions({ start, end }));
  const events = eventsQuery.data ?? [];

  const eventsByDay = useMemo(() => {
    const map = new Map<string, (typeof events)[number][]>();
    for (const event of events) {
      const key = `${event.startTime.getFullYear()}-${event.startTime.getMonth()}-${event.startTime.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    [events]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Interviews, follow-ups, and deadlines across all applications.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus />
            Add event
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add event</DialogTitle>
              <DialogDescription>Schedule an interview, follow-up, or deadline.</DialogDescription>
            </DialogHeader>
            <EventFormDialog onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {eventsQuery.isLoading ? (
        <Skeleton className="h-[480px] w-full" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <DayPicker
                mode="single"
                month={month}
                onMonthChange={setMonth}
                showOutsideDays
                components={{
                  DayButton: (props) => {
                    const { day, className, ...rest } = props;
                    const date = day.date;
                    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                    const dayEvents = eventsByDay.get(key) ?? [];
                    return (
                      <DayButton {...rest} day={day} className={cn("flex-col gap-1", className)}>
                        <span>{date.getDate()}</span>
                        {dayEvents.length > 0 && (
                          <span className="flex items-center justify-center gap-0.5">
                            {dayEvents.slice(0, 3).map((event) => (
                              <span
                                key={event.id}
                                className="size-1 rounded-full bg-primary"
                                title={event.title}
                              />
                            ))}
                          </span>
                        )}
                      </DayButton>
                    );
                  },
                }}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">
              {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h2>
            {sortedEvents.length === 0 ? (
              <Card>
                <CardContent className="py-10">
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>No events this month</EmptyTitle>
                      <EmptyDescription>
                        Add interviews and follow-ups to keep your pipeline on track.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col divide-y rounded-lg border bg-card">
                {sortedEvents.map((event) => {
                  const config = EVENT_TYPE_CONFIG[event.type];
                  return (
                    <div key={event.id} className="flex flex-col gap-1 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{event.title}</span>
                        <Badge className={cn(config.className)}>{config.label}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {event.startTime.toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      {event.applicationId && (
                        <Link
                          href={`/applications/${event.applicationId}`}
                          className="w-fit text-xs text-primary underline-offset-4 hover:underline"
                        >
                          View application
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
