import React, { useState } from "react";
import { addDays, startOfDay, isWithinInterval, isSameDay, format } from "date-fns";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight, Baby, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Appointment {
  date: string | Date;
  purpose: string;
  status: string;
}

interface PregnancyCalendarProps {
  pregnancyStartDate?: string | Date;
  gestationWeek?: number;
  appointments?: Appointment[];
  className?: string;
}

export function PregnancyCalendar({
  pregnancyStartDate,
  gestationWeek,
  appointments = [],
  className,
}: PregnancyCalendarProps) {
  const [hoveredAppt, setHoveredAppt] = useState<Appointment | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  let startDate = new Date();
  if (pregnancyStartDate) {
    startDate = new Date(pregnancyStartDate);
  } else if (gestationWeek != null && gestationWeek >= 0) {
    startDate = addDays(new Date(), -(gestationWeek * 7));
  }

  const normalizedStart = startOfDay(startDate);
  const endDate = addDays(normalizedStart, 280);
  const today = startOfDay(new Date());

  const appointmentMap = appointments.reduce((acc, appt) => {
    if (appt.status !== "cancelled") {
      const key = startOfDay(new Date(appt.date)).getTime();
      acc.set(key, appt);
    }
    return acc;
  }, new Map<number, Appointment>());

  return (
    <div className={cn("w-full relative", className)}>
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4">
          <DayPicker
            mode="single"
            defaultMonth={today}
            showOutsideDays
            classNames={{
              months: "w-full",
              month: "w-full space-y-2",
              /* Caption: arrows on left & right, month name BETWEEN them */
              caption: "relative flex items-center justify-center h-9 mb-2",
              caption_label: "text-sm font-semibold text-foreground",
              nav: "absolute inset-0 flex items-center justify-between pointer-events-none",
              nav_button:
                "pointer-events-auto h-7 w-7 rounded-full bg-muted/60 border border-border inline-flex items-center justify-center hover:bg-muted transition-colors",
              nav_button_previous: "",
              nav_button_next: "",
              table: "w-full border-collapse",
              head_row: "flex w-full mb-1",
              head_cell: "flex-1 text-center text-xs text-muted-foreground font-semibold",
              row: "flex w-full mt-1",
              cell: "flex-1 flex items-center justify-center p-0",
              day: "w-9 h-9 flex items-center justify-center text-sm font-medium rounded-full cursor-pointer outline-none focus:outline-none transition-colors text-foreground hover:bg-muted/60",
              day_outside: "opacity-30",
              day_selected: "",
              day_today: "",
            }}
            components={{
              IconLeft: () => <ChevronLeft className="h-4 w-4" />,
              IconRight: () => <ChevronRight className="h-4 w-4" />,
              DayContent: ({ date }) => {
                const key = startOfDay(date).getTime();
                const isGestation = isWithinInterval(startOfDay(date), {
                  start: normalizedStart,
                  end: endDate,
                });
                const isDueDate = isSameDay(startOfDay(date), endDate);
                const isStart = isSameDay(startOfDay(date), normalizedStart);
                const isToday = isSameDay(startOfDay(date), today);
                const apptData = appointmentMap.get(key);
                const isAppt = !!apptData;

                return (
                  <div
                    className={cn(
                      "relative w-9 h-9 rounded-full flex items-center justify-center transition-all select-none",
                      // Due date: pink filled
                      isDueDate && "bg-pink-500 shadow-md shadow-pink-500/40",
                      // Start date: amber filled
                      isStart && !isDueDate && "bg-amber-400 shadow-md shadow-amber-400/40",
                      // Gestation (middle days): solid sky-blue filled
                      isGestation && !isDueDate && !isStart && "bg-sky-500 shadow-sm shadow-sky-500/30",
                      // Appointment overlay (inside gestation): emerald circle
                      isAppt && isGestation && !isDueDate && !isStart && "bg-emerald-400 shadow-md shadow-emerald-400/30",
                      // Today ring
                      isToday && !isGestation && "ring-2 ring-primary ring-offset-1 ring-offset-card"
                    )}
                    onMouseEnter={(e) => {
                      if (isAppt && apptData) {
                        setHoveredAppt(apptData);
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                      }
                    }}
                    onMouseLeave={() => { setHoveredAppt(null); setTooltipPos(null); }}
                  >
                    <span
                      className={cn(
                        "text-sm font-medium leading-none",
                        (isGestation || isDueDate || isStart) ? "text-white font-semibold" : "text-foreground/80"
                      )}
                    >
                      {date.getDate()}
                    </span>

                    {/* Today ring on gestation days */}
                    {isToday && isGestation && (
                      <div className="absolute inset-0 rounded-full ring-2 ring-white/80 ring-offset-1 pointer-events-none" />
                    )}

                    {/* Baby icon on due date */}
                    {isDueDate && (
                      <Baby className="absolute -top-1 -right-0.5 w-3 h-3 text-pink-100 drop-shadow z-10" />
                    )}

                    {/* Appointment dot for appts outside gestation */}
                    {isAppt && !isGestation && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    )}
                  </div>
                );
              },
            }}
          />
        </div>

        {/* Appointment tooltip */}
        {hoveredAppt && tooltipPos && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{ left: tooltipPos.x, top: tooltipPos.y - 10, transform: "translate(-50%, -100%)" }}
          >
            <div className="bg-popover border border-border rounded-xl shadow-xl px-3 py-2.5 text-xs max-w-[210px]">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold">{format(new Date(hoveredAppt.date), "MMM d, yyyy")}</span>
              </div>
              <p className="text-muted-foreground leading-snug">{hoveredAppt.purpose}</p>
              <span className={cn("inline-block mt-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                hoveredAppt.status === "completed" ? "bg-emerald-500/20 text-emerald-400"
                  : hoveredAppt.status === "cancelled" ? "bg-destructive/20 text-destructive"
                  : "bg-primary/20 text-primary")}>
                {hoveredAppt.status}
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="px-4 py-3 border-t border-border/50 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground font-medium bg-muted/10">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-sky-500" />
            <span>Gestation period</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span>Start date</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-pink-500" />
            <span>Due date</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Appointment</span>
          </div>
        </div>
      </div>
    </div>
  );
}
