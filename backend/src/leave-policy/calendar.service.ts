import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { eachDayOfInterval, isSunday, format } from 'date-fns';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates the exact debitable days (duration) for a leave request based on the
   * institutional holiday rules defined in the active LeavePolicy.
   */
  async calculateDuration(
    startDate: Date,
    endDate: Date,
    holidayCountingRule: string,
    isHalfDay: boolean
  ): Promise<number> {
    const holidays = await this.prisma.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const holidaySet = new Set(holidays.map((h) => format(h.date, 'yyyy-MM-dd')));
    const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Half day is always 0.5 regardless of interval, assuming start=end if half day.
    if (isHalfDay) {
      return 0.5;
    }

    let duration = 0;
    const totalDays = daysInInterval.length;

    for (let i = 0; i < totalDays; i++) {
      const currentDay = daysInInterval[i];
      const dateStr = format(currentDay, 'yyyy-MM-dd');
      
      const isSun = isSunday(currentDay);
      const isHol = holidaySet.has(dateStr);

      if (holidayCountingRule === 'IGNORE' || holidayCountingRule === 'IGNORE_ALL') {
        // Subtract if Sunday or Holiday
        if (!isSun && !isHol) {
          duration++;
        }
      } else if (holidayCountingRule === 'COUNT_SANDWICHED' || holidayCountingRule === 'CONDITIONAL') {
        // Boundary Logic: Only subtract if Sunday/Holiday is strictly at the start or end boundary.
        if (isSun || isHol) {
          if (i === 0 || i === totalDays - 1) {
            // It's a boundary, do NOT count it. (e.g. Leave started on Sunday)
          } else {
            // Trapped in the middle, counts against balance!
            duration++;
          }
        } else {
          duration++;
        }
      } else if (holidayCountingRule === 'COUNT_AS_LEAVE') {
        // Every day counts
        duration++;
      } else {
        // Default safe fallback
        duration++;
      }
    }

    return duration;
  }
}
