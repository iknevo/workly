"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parts = value ? value.split(":") : ["", ""];
  const hour24 = parts[0] ? parseInt(parts[0], 10) : 12;
  const minute = parts[1] ? parseInt(parts[1], 10) : 0;
  const hour12 = hour24 % 12 || 12;
  const ampm = hour24 < 12 ? "AM" : "PM";

  const to24Hour = (h12: number, meridiem: "AM" | "PM") => {
    if (h12 === 12) return meridiem === "AM" ? 0 : 12;
    return meridiem === "PM" ? h12 + 12 : h12;
  };

  const updateTime = (updates: { hour?: number; minute?: number; ampm?: "AM" | "PM" }) => {
    const newHour24 = to24Hour(updates.hour ?? hour12, updates.ampm ?? ampm);
    const newMinute = updates.minute !== undefined ? updates.minute : minute;
    onChange(`${String(newHour24).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`);
  };

  const displayValue = value
    ? `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <Clock className="mr-2 size-4 shrink-0" />
        {displayValue || <span>Pick a time</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex items-center gap-2">
          <Select
            value={String(hour12)}
            onValueChange={(v) => {
              if (v != null) updateTime({ hour: parseInt(v) });
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {String(h).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="shrink-0 text-sm text-muted-foreground">:</span>
          <Select
            value={String(minute)}
            onValueChange={(v) => {
              if (v != null) updateTime({ minute: parseInt(v) });
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {String(m).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={ampm}
            onValueChange={(v) => {
              if (v != null) updateTime({ ampm: v as "AM" | "PM" });
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
