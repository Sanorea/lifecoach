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
  category: 'Terminblocker';
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

  // Werte für Editiermodus
  workStart: string = '08:00';
  workEnd: string = '17:00';
  breakfast: string = '09:00';
  lunch: string = '12:00';
  dinner: string = '18:30';

  editMode = false;

  async ngOnInit() {
    this.tasks = await this.firebase.loadTasksFromFirebase();

    // Lade gespeicherte Werte (falls vorhanden)
    this.restoreTimesFromTasks();

    this.plan = this.buildDailyPlan(this.tasks);
  }

  toggleEdit() {
    this.editMode = !this.editMode;
  }

  async saveSettings() {
    // Schreibe Blocker für Arbeitszeit + Mahlzeiten in Firebase
    await this.upsertBlocker('Arbeitstag', this.workStart, this.workEnd);
    await this.upsertBlocker('Frühstück', this.breakfast, this.addMinutes(this.breakfast, 30));
    await this.upsertBlocker('Mittagessen', this.lunch, this.addMinutes(this.lunch, 60));
    await this.upsertBlocker('Abendessen', this.dinner, this.addMinutes(this.dinner, 60));

    // Neu laden
    this.tasks = await this.firebase.loadTasksFromFirebase();
    this.plan = this.buildDailyPlan(this.tasks);

    this.editMode = false;
  }

  private async upsertBlocker(title: string, startHHMM: string, endHHMM: string | number) {
    const start = this.parseTime(startHHMM);
    const end = typeof endHHMM === 'string' ? this.parseTime(endHHMM) : endHHMM;

    let existing = this.tasks.find(t => t.title === title && t.category === 'Terminblocker');
    if (existing) {
      await this.firebase.updateTask({
        ...existing,
        description: `${this.format(start)} - ${this.format(end)}`
      });
    } else {
      const newTask: ToDos = {
        id: '',
        title,
        category: 'Terminblocker',
        description: `${this.format(start)} - ${this.format(end)}`,
        priority: 0,
        deadline: '',
        duration: 0,
        frequency: 'once',
        done: false
      };
      await this.firebase.addTask(newTask);
    }
  }

  private restoreTimesFromTasks() {
    const findBlock = (title: string) =>
      this.tasks.find(t => t.title === title && t.category === 'Terminblocker');

    const arbeitstag = findBlock('Arbeitstag');
    if (arbeitstag) {
      const r = this.parseRange(arbeitstag.description!);
      if (r) {
        this.workStart = this.format(r.start);
        this.workEnd = this.format(r.end);
      }
    }

    const frühstück = findBlock('Frühstück');
    if (frühstück) {
      const r = this.parseRange(frühstück.description!);
      if (r) this.breakfast = this.format(r.start);
    }

    const mittag = findBlock('Mittagessen');
    if (mittag) {
      const r = this.parseRange(mittag.description!);
      if (r) this.lunch = this.format(r.start);
    }

    const abend = findBlock('Abendessen');
    if (abend) {
      const r = this.parseRange(abend.description!);
      if (r) this.dinner = this.format(r.start);
    }
  }

  // =========================
  // Plan-Logik
  // =========================
  private buildDailyPlan(tasks: ToDos[]): ScheduledItem[] {
    // 1) Alle Terminblocker
    const allBlocks = tasks
      .filter(t => t.category === 'Terminblocker')
      .map(tb => this.parseToTimeBlock(tb))
      .filter((b): b is TimeBlock => !!b);

    // 2) Arbeitszeit bestimmen
    const workBlock = allBlocks.find(b => b.title === 'Arbeitstag');
    const workStart = workBlock?.start ?? this.parseTime(this.workStart);
    const workEnd = workBlock?.end ?? this.parseTime(this.workEnd);

    // 3) Alle Terminblocker außer „Arbeitstag“ für die Anzeige
    const terminblocker = allBlocks
      .filter(b => b !== workBlock)
      .map(b => this.clipToDay(b, workStart, workEnd))
      .filter(b => b.end > b.start)
      .sort((a, b) => a.start - b.start);

    // 4) Freie Slots zwischen den sichtbaren Blockern
    const freeSlots = this.findFreeSlots(terminblocker, workStart, workEnd);

    // 5) Nicht-Blocker ToDos vorbereiten & nach komplexer Logik sortieren
    const todos = this.sortTasksForCalendar(
      tasks.filter(t => t.category !== 'Terminblocker' && !t.done)
    ).map(t => ({ ...t, remaining: Math.max(1, t.duration || 60) }));

    const scheduledTodos: ScheduledItem[] = [];
    for (const slot of freeSlots) {
      let cursor = slot.start;
      while (cursor < slot.end && todos.length > 0) {
        const current = todos[0];
        const space = slot.end - cursor;
        const chunk = Math.min(space, current.remaining);

        scheduledTodos.push({
          id: current.id,
          title: current.title,
          category: current.category,
          start: cursor,
          end: cursor + chunk,
          done: current.done,
          isBlocker: false,
        });

        cursor += chunk;
        current.remaining -= chunk;
        if (current.remaining <= 0) todos.shift();
      }
    }

    const blockerAsScheduled: ScheduledItem[] = terminblocker.map(b => ({
      id: b.id,
      title: b.title,
      category: 'Terminblocker',
      start: b.start,
      end: b.end,
      isBlocker: true,
    }));

    return [...blockerAsScheduled, ...scheduledTodos].sort((a, b) => a.start - b.start);
  }

  // =========================
  // Helfer: Sortierung nach komplexer Logik
  // =========================
  private sortTasksForCalendar(tasks: ToDos[]): ToDos[] {
    const now = new Date();

    return tasks.sort((a, b) => {
      const getSortValue = (task: ToDos): number => {
        const deadline = task.deadline ? new Date(task.deadline) : null;
        const daysDiff = deadline ? Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)) : null;

        switch (task.category) {
          case 'To-Do - dringend': return 0;
          case 'To-Do':
            if (daysDiff !== null && daysDiff > 5) return 1; // überfällige > 5 Tage
            if (daysDiff !== null && daysDiff >= -3) return 4; // Deadline in nächsten 3 Tagen oder überschritten
            return 6; // restliche To-Do
          case 'homework':
            if (daysDiff !== null && daysDiff > 6) return 2; // überfällige > 6 Tage
            return 5; // restliche Homework
          case 'Admin': return 3;
          default: return 7;
        }
      };

      return getSortValue(a) - getSortValue(b);
    });
  }

  // =========================
  // Weitere Helfer
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
    return { id: t.id, title: t.title || 'Block', category: 'Terminblocker', start: range.start, end: range.end };
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
    return ((mins - dayStart) / (dayEnd - dayStart)) * 100;
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
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  isShortItem(item: ScheduledItem): boolean {
  return (item.end - item.start) < 60;
}

}
