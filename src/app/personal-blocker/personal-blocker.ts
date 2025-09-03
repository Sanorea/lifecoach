import { Component, inject } from '@angular/core';
import { ToDos } from '../interfaces/to-dos.interface';
import { FirebaseService } from '../services/firebase';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-personal-blocker',
  imports: [CommonModule, FormsModule],
  templateUrl: './personal-blocker.html',
  styleUrl: './personal-blocker.scss'
})
export class PersonalBlocker {
  firebase = inject(FirebaseService);
  blockerList: ToDos[] = [];

  // aktuelles Eingabeobjekt
  newBlock = {
    title: '',
    start: '',
    end: '',
    day: ''
  };

  async ngOnInit() {
    await this.refreshBlockerList();
  }

  trackById(index: number, item: ToDos) {
    return item.id;
  }

  private async refreshBlockerList() {
    const allTasks = await this.firebase.loadTasksFromFirebase();
    this.blockerList = allTasks.filter(t => t.category === 'personal-blocker');
  }

  async deleteScheduleInformation(id: string) {
    await this.firebase.deleteTask(id);
    await this.refreshBlockerList();
  }

  async saveNewBlock() {
    if (!this.newBlock.title || !this.newBlock.start || !this.newBlock.end || !this.newBlock.day) {
      alert('Bitte alle Felder ausfüllen!');
      return;
    }

    const newTask: ToDos = {
      id: '',
      title: this.newBlock.title,
      description: `${this.newBlock.start} - ${this.newBlock.end}`,
      category: 'personal-blocker',
      priority: 0,
      deadline: this.newBlock.day, // Tag speichern
      done: false,
      duration: 0,
      frequency: 'once',
      earliest: '',
    };

    await this.firebase.addTask(newTask);
    await this.refreshBlockerList();

    // Formular zurücksetzen
    this.newBlock = { title: '', start: '', end: '', day: '' };
  }

  async editBlocker(task: ToDos) {
    const [start, end] = task.description.split(' - ');
    const newStart = prompt(`Neuer Start für ${task.title}:`, start);
    const newEnd = prompt(`Neues Ende für ${task.title}:`, end);
    const newDay = prompt(`Neues Datum (YYYY-MM-DD):`, task.deadline);

    if (newStart && newEnd && newDay) {
      await this.firebase.updateTask({
        ...task,
        description: `${newStart} - ${newEnd}`,
        deadline: newDay
      });
      await this.refreshBlockerList();
    }
  }
}
