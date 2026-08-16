"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import type {
  CalendarOptions,
  DatesSetArg,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import interactionPlugin, { type DateClickArg, type EventResizeDoneArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMinutes, endOfMonth, startOfMonth, subDays } from "date-fns";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import type { events } from "@/db/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { EVENT_TYPE_CONFIG } from "@/modules/applications/constants";
import { useTRPC } from "@/trpc/client";

import { EventFormDialog } from "./event-form-dialog";

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

const CALENDAR_OPTIONS: CalendarOptions = {
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
  slotLabelFormat: { hour: "numeric", minute: "2-digit", omitZeroMinute: true, meridiem: "short" },
  eventTimeFormat: { hour: "numeric", minute: "2-digit", omitZeroMinute: true, meridiem: "short" },
  headerToolbar: {
    left: "title",
    center: "",
    right: "prev,next today dayGridMonth,timeGridWeek,timeGridDay,listWeek",
  },
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

export function CalendarPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [range, setRange] = useState({
    start: subDays(startOfMonth(new Date()), 7),
    end: addDays(endOfMonth(new Date()), 7),
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [defaultStartTime, setDefaultStartTime] = useState<Date | undefined>(undefined);
  const [defaultEndTime, setDefaultEndTime] = useState<Date | undefined>(undefined);

  const initialView = isMobile ? "listWeek" : "timeGridWeek";

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
        endTime: arg.event.end ?? addMinutes(arg.event.start, Math.max(durationMs, MIN_EVENT_DURATION_MS)),
      },
      { onError: () => arg.revert() }
    );
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
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-medium">Calendar</h1>
        </div>
        <Button size="sm" onClick={() => openCreateSheet()}>
          <Plus />
          Add event
        </Button>
      </div>

      {eventsQuery.isPending ? (
        <Skeleton className="h-[70vh] w-full rounded-lg" />
      ) : (
        <div className="calendar-shell rounded-lg border bg-background p-2 shadow-sm sm:p-4">
          <FullCalendar
            {...CALENDAR_OPTIONS}
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
