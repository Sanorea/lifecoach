import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../services/firebase';
import { ToDos } from '../interfaces/to-dos.interface';

interface ScheduledItem {
  id?: string;
  title: string;
  category: string;
  start: number;
  end: number;
  done?: boolean;
  isBlocker: boolean;
}

interface TimeBlock {
  id?: string;
  title: string;
  start: number;
  end: number;
  category: 'Terminblocker' | 'personal-blocker';
}

interface FreeSlot {
  start: number;
  end: number;
}

@Component({
  selector: 'app-daily-plan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-plan.html',
  styleUrls: ['./daily-plan.scss']
})
export class DailyPlan implements OnInit {
  private firebase = inject(FirebaseService);

  tasks: ToDos[] = [];
  plan: ScheduledItem[] = [];

  public selectedDate: Date = new Date();
  private startDate: Date = new Date(); // Basisdatum für Zeitberechnung

  workStart: string = '08:00';
  workEnd: string = '17:00';
  breakfast: string = '09:00';
  lunch: string = '12:00';
  dinner: string = '18:30';

  editMode = false;
  daytime: any;

  async ngOnInit() {
    this.startDate.setHours(0, 0, 0, 0); // auf Mitternacht setzen
    this.tasks = await this.firebase.loadTasksFromFirebase();
    this.refreshPlan();
    this.restoreTimesFromTasks();
    this.plan = this.buildDailyPlan(this.tasks);


  }

  toggleEdit() {
    this.editMode = !this.editMode;
  }

  private restoreTimesFromTasks() {
    const arbeitstag = this.restoreBlockerTimes('Arbeitstag');
    if (arbeitstag) {
      this.workStart = this.format(arbeitstag.start);
      this.workEnd = this.format(arbeitstag.end);
    }

    this.breakfast = this.restoreMealTime('Frühstück', this.breakfast);
    this.lunch = this.restoreMealTime('Mittagessen', this.lunch);
    this.dinner = this.restoreMealTime('Abendessen', this.dinner);
  }

  private async refreshPlan() {
    const allTasks = await this.firebase.loadTasksFromFirebase();

    // nur Tasks für das ausgewählte Datum
    const dayString = this.selectedDate.toISOString().split('T')[0]; // yyyy-mm-dd
    const tasksForDay = allTasks.filter(t =>
      !t.deadline || t.deadline.startsWith(dayString) || t.category === 'Terminblocker'
    );

        this.plan = this.buildDailyPlan(tasksForDay);

  }


  private restoreBlockerTimes(title: string): { start: number; end: number } | null {
    const task = this.tasks.find(t => t.title === title && t.category === 'Terminblocker');
    if (!task) return null;
    const range = this.parseRange(task.description || '');
    return range ?? null;
  }

  private restoreMealTime(title: string, defaultValue: string): string {
    const range = this.restoreBlockerTimes(title);
    return range ? this.format(range.start) : defaultValue;
  }

  // =========================
  // Plan-Logik
  // =========================
  private buildDailyPlan(tasks: ToDos[]): ScheduledItem[] {
    const allBlocks = this.getAllBlocks(tasks);
    const { workStart, workEnd, workBlock } = this.getWorkTimes(allBlocks);
    const visibleBlocks = this.getVisibleBlocks(allBlocks, workBlock, workStart, workEnd);
    const DAYS = 7;
    // NEU: mehrere Tage Slots
    const freeSlots = this.getMultiDaySlots(visibleBlocks, workStart, workEnd, DAYS); // array mit allen freien slots der nächsten 7 Tage

    const todos = this.getSortedTodos(tasks); // array mit allen to-dos und homeworks

    const scheduledTodos = this.scheduleTodos(todos, freeSlots); // array mit o-do's aufgeteilt in freie slots


    const blockerAsScheduled = this.scheduleBlockers(visibleBlocks, DAYS);

    return [...blockerAsScheduled, ...scheduledTodos].sort((a, b) => a.start - b.start);
  }

  private getAllBlocks(tasks: ToDos[]): TimeBlock[] {
    return tasks
      .filter(t => t.category === 'Terminblocker' || t.category === 'personal-blocker')
      .map(t => this.parseToTimeBlock(t))
      .filter((b): b is TimeBlock => !!b);
  }

  private getWorkTimes(blocks: TimeBlock[]): { workStart: number; workEnd: number; workBlock?: TimeBlock } {
    const workBlock = blocks.find(b => b.title === 'Arbeitstag');
    const workStart = workBlock?.start ?? this.parseTime(this.workStart);
    const workEnd = workBlock?.end ?? this.parseTime(this.workEnd);
    return { workStart, workEnd, workBlock };
  }

  private getVisibleBlocks(blocks: TimeBlock[], workBlock: TimeBlock | undefined, workStart: number, workEnd: number): TimeBlock[] {
    return blocks
      .filter(b => b !== workBlock)
      .map(b => this.clipToDay(b, workStart, workEnd))
      .filter(b => b.end > b.start)
      .sort((a, b) => a.start - b.start);
  }

  // NEU: MultiDay Slots
  private getMultiDaySlots(visibleBlocks: TimeBlock[], workStart: number, workEnd: number, days: number): FreeSlot[] {
    const slots: FreeSlot[] = [];


    for (let d = 0; d < days; d++) {
      const offset = d * 24 * 60;
      const dayStart = workStart + offset;
      const dayEnd = workEnd + offset;

      const dayBlocks = visibleBlocks
        .map(b => ({
          ...b,
          start: b.start + offset,
          end: b.end + offset,
        }))
        .filter(b => b.start < dayEnd && b.end > dayStart);

      slots.push(...this.findFreeSlots(dayBlocks, dayStart, dayEnd));
    }

    return slots;
  }

  private getSortedTodos(tasks: ToDos[]) {
    return this.sortTasksForCalendar(
      tasks.filter(t => t.category !== 'Terminblocker' && t.category !== 'personal-blocker' && !t.done)
    ).map(t => ({ ...t, remaining: Math.max(1, t.duration || 60) }));
  }

  private scheduleTodos(todos: any[], freeSlots: FreeSlot[]): ScheduledItem[] {
    const scheduledTodos: ScheduledItem[] = [];
    let cursor = 0;
    for (const todo of todos) {
      let remaining = todo.remaining;
      while (remaining > 0 && cursor < freeSlots.length) {
        const slot = freeSlots[cursor];
        const available = slot.end - slot.start;
        if (available <= 0) {
          cursor++;
          continue;
        }

        const chunk = Math.min(remaining, available);

        scheduledTodos.push({
          id: todo.id,
          title: todo.title,
          category: todo.category,
          start: slot.start,
          end: slot.start + chunk,
          done: todo.done,
          isBlocker: false,
        });

        slot.start += chunk;
        remaining -= chunk;

        if (slot.start >= slot.end) cursor++;
      }
    }

    return scheduledTodos;
  }

  private scheduleBlockers(blocks: TimeBlock[], days: number = 7): ScheduledItem[] {
    const scheduled: ScheduledItem[] = [];

    for (let d = 0; d < days; d++) {
      const offset = d * 24 * 60; // Minuten pro Tag
      for (const b of blocks) {
        scheduled.push({
          id: b.id,
          title: b.title,
          category: b.category,
          start: b.start + offset,
          end: b.end + offset,
          isBlocker: true,
        });
      }
    }

    return scheduled;
  }


  // =========================
  // Helfer
  // =========================
  private clipToDay(b: TimeBlock, dayStart: number, dayEnd: number): TimeBlock {
    return { ...b, start: Math.max(b.start, dayStart), end: Math.min(b.end, dayEnd) };
  }

  private findFreeSlots(blocks: TimeBlock[], dayStart: number, dayEnd: number): FreeSlot[] {
    const slots: FreeSlot[] = [];
    let cursor = dayStart;

    for (const b of blocks) {
      if (b.start > cursor) slots.push({ start: cursor, end: b.start });
      cursor = Math.max(cursor, b.end);
    }

    if (cursor < dayEnd) slots.push({ start: cursor, end: dayEnd });

    return slots;
  }

  private parseToTimeBlock(t: ToDos): TimeBlock | null {
    const range = this.parseRange(t.description || '');
    if (!range) return null;
    return {
      id: t.id,
      title: t.title || 'Block',
      category: t.category === 'personal-blocker' ? 'personal-blocker' : 'Terminblocker',
      start: range.start,
      end: range.end
    };
  }

  private parseRange(text: string): { start: number; end: number } | null {
    const m = text.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const start = this.hhmmtomin(+m[1], +m[2]);
    const end = this.hhmmtomin(+m[3], +m[4]);
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    return { start, end };
  }

  private parseTime(hhmm: string): number {
    const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 0;
    return this.hhmmtomin(+m[1], +m[2]);
  }

  private hhmmtomin(h: number, m: number): number {
    return h * 60 + m;
  }

  private addMinutes(hhmm: string, minutes: number): number {
    return this.parseTime(hhmm) + minutes;
  }

  format(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  timeToPercent(mins: number): number {
    const dayStart = this.parseTime(this.workStart);
    const dayEnd = this.parseTime(this.workEnd);
    return ((mins % (24 * 60) - dayStart) / (dayEnd - dayStart)) * 100;
  }

  durationToPercent(start: number, end: number): number {
    const dayStart = this.parseTime(this.workStart);
    const dayEnd = this.parseTime(this.workEnd);
    return ((end - start) / (dayEnd - dayStart)) * 100;
  }

  get hours(): number[] {
    const start = Math.floor(this.parseTime(this.workStart) / 60);
    const end = Math.ceil(this.parseTime(this.workEnd) / 60);
    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }

  minutesToTime(mins: number): string {
    const h = Math.floor((mins % (24 * 60)) / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  isShortItem(item: ScheduledItem): boolean {
    return (item.end - item.start) < 60;
  }

  private sortTasksForCalendar(tasks: ToDos[]): ToDos[] {
    const now = new Date();

    return tasks.sort((a, b) => {
      const getSortValue = (task: ToDos): number => {
        const deadline = task.deadline ? new Date(task.deadline) : null;
        const daysDiff = deadline ? Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)) : null;

        switch (task.category) {
          case 'To-Do - dringend': return 0;
          case 'To-Do':
            if (daysDiff !== null && daysDiff > 5) return 1;
            if (daysDiff !== null && daysDiff >= -3) return 4;
            return 6;
          case 'homework':
            if (daysDiff !== null && daysDiff > 6) return 2;
            return 5;
          case 'Admin': return 3;
          default: return 7;
        }
      };

      return getSortValue(a) - getSortValue(b);
    });
  }

  // =========================
  // Daypicker + Filter
  // =========================
  onDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.selectedDate = new Date(input.value);
      this.refreshPlan(); // 🔥 neu hinzufügen!
    }
  }


  get itemsForSelectedDate(): ScheduledItem[] {
    const dayStart = this.startOfDayInMinutes(this.selectedDate);
    const dayEnd = dayStart + 24 * 60;

    return this.plan.filter(item =>
      item.start >= dayStart && item.start < dayEnd
    );
  }

  private startOfDayInMinutes(date: Date): number {
    const base = new Date(date);
    base.setHours(0, 0, 0, 0);
    const diff = (base.getTime() - this.startDate.getTime()) / (1000 * 60);
    return diff;
  }
}
