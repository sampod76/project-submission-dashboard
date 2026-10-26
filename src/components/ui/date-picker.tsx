"use client";

import { useState, type ComponentProps } from "react";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import dayjs from "dayjs";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";

type DatePickerProps = Omit<ComponentProps<typeof Button>, "value" | "onChange"> & {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value && dayjs(value).isValid() ? dayjs(value).toDate() : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          {...props}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between px-3 text-left font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          {selected ? format(selected, "yyyy-MM-dd") : placeholder}
          <CalendarDays className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[1100] w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : null);
            setOpen(false);
          }}
          initialFocus
        />
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
        >
          Clear
        </Button>
      </PopoverContent>
    </Popover>
  );
}
