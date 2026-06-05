import React from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function toDate(value) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIsoDate(date) {
  if (!date) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export default function DatePickerButton({ value, onChange, placeholder = "Tarix seçin", testId }) {
  const selected = toDate(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-testid={testId}
          className={cn("h-11 w-full justify-start text-left font-normal mt-1", !value && "text-slate-500")}
        >
          <CalendarDays className="w-4 h-4 mr-2" />
          {value ? selected?.toLocaleDateString("az-AZ") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar mode="single" selected={selected} onSelect={(date) => onChange(toIsoDate(date))} initialFocus />
      </PopoverContent>
    </Popover>
  );
}
