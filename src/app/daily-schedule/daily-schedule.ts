import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../services/firebase';
import { ToDos } from '../interfaces/to-dos.interface';

interface BlockDefinition {
  key: string;
  label: string;
  start: string;
  end: string;
}

@Component({
  selector: 'app-daily-schedule',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './daily-schedule.html',
  styleUrls: ['./daily-schedule.scss']
})
export class DailySchedule {
  firebase = inject(FirebaseService);
  blockerList: ToDos[] = [];

  // Eingabefeld für manuell hinzugefügte Blöcke
  otherInsert = '';

  // Definierte Blöcke
  allBlocks: BlockDefinition[] = [
    { key: 'work', label: 'Arbeitstag', start: '', end: '' },
    { key: 'breakfast', label: 'Frühstück', start: '', end: '' },
    { key: 'lunch', label: 'Mittagessen', start: '', end: '' },
    { key: 'dinner', label: 'Abendessen', start: '', end: '' },
  ];

  remainingBlocks: BlockDefinition[] = []; // noch nicht gespeicherte

  async ngOnInit() {
    await this.refreshBlockerList();
  }

  trackById(index: number, item: ToDos) {
    return item.id;
  }

  private async refreshBlockerList() {
    const allTasks = await this.firebase.loadTasksFromFirebase();
    this.blockerList = allTasks.filter(t => t.category === 'Terminblocker');

    // noch nicht vorhandene Blöcke herausfiltern
    this.remainingBlocks = this.allBlocks.filter(b =>
      !this.blockerList.some(t => t.title === b.label)
    );
  }

  async deleteScheduleInformation(id: string) {
    await this.firebase.deleteTask(id);
    await this.refreshBlockerList(); // neu berechnen
  }

  async saveSchedule() {
    for (const block of this.remainingBlocks) {
      if (!block.start || !block.end) continue;

      const newTask: ToDos = {
        id: '',
        title: block.label,
        description: `${block.start} - ${block.end}`,
        category: 'Terminblocker',
        priority: 0,
        deadline: '',
        done: false,
        duration: 0,
        frequency: 'once',
        earliest: '',
      };

      await this.firebase.addTask(newTask);
    }

    await this.refreshBlockerList();
    alert('Neue Tagesstruktur gespeichert!');
  }

  async editBlocker(task: ToDos) {
    const [start, end] = task.description.split(' - ');
    const newStart = prompt(`Neuer Start für ${task.title}:`, start);
    const newEnd = prompt(`Neues Ende für ${task.title}:`, end);

    if (newStart && newEnd) {
      await this.firebase.updateTask({
        ...task,
        description: `${newStart} - ${newEnd}`
      });
      await this.refreshBlockerList();
    }
  }

  // >>> NEU: eigenen Block hinzufügen
  addBlock() {
    if (!this.otherInsert.trim()) {
      return;
    }

    const key = this.otherInsert.trim().toLowerCase().replace(/\s+/g, '_');

    // Prüfen, ob Block schon existiert
    const exists = this.allBlocks.some(b => b.key === key);
    if (exists) {
      alert('Block existiert bereits!');
      return;
    }

    this.allBlocks.push({
      key,
      label: this.otherInsert.trim(),
      start: '',
      end: ''
    });

    // remainingBlocks neu berechnen, damit er direkt angezeigt wird
    this.remainingBlocks = this.allBlocks.filter(b =>
      !this.blockerList.some(t => t.title === b.label)
    );

    // Feld zurücksetzen
    this.otherInsert = '';
  }
}
