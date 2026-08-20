"use client";

import type {
  CalendarOptions,
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, {
  type DateClickArg,
  type EventResizeDoneArg,
} from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMinutes, endOfMonth, startOfMonth, subDays } from "date-fns";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import { EventFormDialog } from "./event-form-dialog";
import type { events } from "@/db/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { EVENT_TYPE_CONFIG } from "@/modules/applications/constants";
import { useTRPC } from "@/trpc/client";

const FullCalendar = dynamic(() => import("@fullcalendar/react"), {
  ssr: false,
  loading: () => <Skeleton className="h-[70vh] w-full rounded-lg" />,
}) as React.ComponentType<CalendarOptions & { ref?: React.RefObject<unknown | null> }>;

type Event = typeof events.$inferSelect;

const MIN_EVENT_DURATION_MS = 30 * 60 * 1000;

function toEventInput(event: Event): EventInput {
  const endTime = event.endTime ?? addMinutes(event.startTime, 30);
  return {
    id: event.id,
    title: event.title,
    start: event.startTime.toISOString(),
    end: endTime.toISOString(),
    classNames: [EVENT_TYPE_CONFIG[event.type].className],
    extendedProps: {
      type: event.type,
      applicationId: event.applicationId,
      description: event.description,
    },
  };
}

const VIEW_OPTIONS = [
  { value: "dayGridMonth", label: "Month" },
  { value: "timeGridWeek", label: "Week" },
  { value: "timeGridDay", label: "Day" },
  { value: "listWeek", label: "List" },
] as const;

const viewItems = VIEW_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

function getCalendarOptions(): CalendarOptions {
  return {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    height: "auto",
    nowIndicator: true,
    navLinks: true,
    editable: true,
    eventResizableFromStart: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    firstDay: 1,
    slotDuration: "00:30:00",
    slotLabelFormat: {
      hour: "numeric",
      minute: "2-digit",
      omitZeroMinute: true,
      meridiem: "short",
    },
    eventTimeFormat: {
      hour: "numeric",
      minute: "2-digit",
      omitZeroMinute: true,
      meridiem: "short",
    },
    headerToolbar: { left: "prev,next today", center: "title", right: "" },
    buttonText: {
      today: "Today",
      month: "Month",
      week: "Week",
      day: "Day",
      list: "List",
    },
    views: {
      timeGridWeek: { slotMinTime: "08:00:00", slotMaxTime: "20:00:00" },
      timeGridDay: { slotMinTime: "08:00:00", slotMaxTime: "20:00:00" },
    },
  };
}

export function CalendarPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const calendarRef = useRef<any>(null);

  const [range, setRange] = useState({
    start: subDays(startOfMonth(new Date()), 7),
    end: addDays(endOfMonth(new Date()), 7),
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [defaultStartTime, setDefaultStartTime] = useState<Date | undefined>(undefined);
  const [defaultEndTime, setDefaultEndTime] = useState<Date | undefined>(undefined);
  const [currentView, setCurrentView] = useState(isMobile ? "listWeek" : "timeGridWeek");

  const initialView = currentView;

  const eventsQuery = useQuery(
    trpc.events.getManyForMonth.queryOptions(
      { start: range.start, end: range.end },
      { placeholderData: keepPreviousData }
    )
  );
  const eventInputs = useMemo(() => (eventsQuery.data ?? []).map(toEventInput), [eventsQuery.data]);
  const events = eventsQuery.data ?? [];

  const updateTimes = useMutation(
    trpc.events.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.events.getManyForMonth.queryKey() });
      },
    })
  );

  const handleDatesSet = (arg: DatesSetArg) => {
    setRange({ start: subDays(arg.start, 7), end: addDays(arg.end, 7) });
  };

  const openCreateSheet = (start?: Date, end?: Date) => {
    setEditingEvent(null);
    setDefaultStartTime(start);
    setDefaultEndTime(end);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingEvent(null);
    setDefaultStartTime(undefined);
    setDefaultEndTime(undefined);
  };

  const handleDateClick = (arg: DateClickArg) => {
    openCreateSheet(arg.date);
  };

  const handleSelect = (arg: DateSelectArg) => {
    openCreateSheet(arg.start, arg.end);
    arg.view.calendar.unselect();
  };

  const handleEventClick = (arg: EventClickArg) => {
    const event = events.find((e) => e.id === arg.event.id);
    if (!event) return;
    setEditingEvent(event);
    setDefaultStartTime(undefined);
    setDefaultEndTime(undefined);
    setSheetOpen(true);
  };

  const handleEventMove = (arg: EventDropArg) => {
    const existing = events.find((e) => e.id === arg.event.id);
    if (!existing || !arg.event.start) {
      arg.revert();
      return;
    }
    const durationMs =
      existing.endTime && existing.endTime > existing.startTime
        ? existing.endTime.getTime() - existing.startTime.getTime()
        : MIN_EVENT_DURATION_MS;
    updateTimes.mutate(
      {
        id: existing.id,
        startTime: arg.event.start,
        endTime:
          arg.event.end ?? addMinutes(arg.event.start, Math.max(durationMs, MIN_EVENT_DURATION_MS)),
      },
      { onError: () => arg.revert() }
    );
  };

  const handleViewChange = (value: string | null) => {
    if (!value) return;
    setCurrentView(value);
    calendarRef.current?.getApi().changeView(value);
  };

  const handleEventResize = (arg: EventResizeDoneArg) => {
    const existing = events.find((e) => e.id === arg.event.id);
    if (!existing || !arg.event.start || !arg.event.end) {
      arg.revert();
      return;
    }
    updateTimes.mutate(
      {
        id: existing.id,
        startTime: arg.event.start,
        endTime: arg.event.end,
      },
      { onError: () => arg.revert() }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-medium">Calendar</h1>
        <div className="flex items-center gap-2">
          <Select value={currentView} onValueChange={handleViewChange} items={viewItems}>
            <SelectTrigger size="sm" className="w-auto">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {viewItems.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => openCreateSheet()}>
            <Plus />
            Add event
          </Button>
        </div>
      </div>

      {eventsQuery.isPending ? (
        <Skeleton className="h-[70vh] w-full rounded-lg" />
      ) : (
        <div className="calendar-shell rounded-lg border bg-background p-2 shadow-sm sm:p-4">
          <FullCalendar
            ref={calendarRef}
            {...getCalendarOptions()}
            initialView={initialView}
            events={eventInputs}
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventMove}
            eventResize={handleEventResize}
          />
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingEvent ? "Edit event" : "Add event"}</SheetTitle>
            <SheetDescription>
              {editingEvent
                ? "Update the event details, or delete it."
                : "Schedule a new application event on your calendar."}
            </SheetDescription>
          </SheetHeader>
          <EventFormDialog
            initial={editingEvent ?? undefined}
            defaultStartTime={defaultStartTime}
            defaultEndTime={defaultEndTime}
            onClose={closeSheet}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
