import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FirebaseService } from '../services/firebase';
import { ToDos } from '../interfaces/to-dos.interface';
import { CommonModule } from '@angular/common';
import { HomeworkPopup } from './homework-popup/homework-popup';

@Component({
  selector: 'app-regular-tasks',
  imports: [RouterModule, CommonModule, HomeworkPopup],
  templateUrl: './regular-tasks.html',
  styleUrl: './regular-tasks.scss'
})
export class RegularTasks {
 firebase = inject(FirebaseService);

  homeworkList: ToDos[] = [];
  showPopup = false;
  currentTask: ToDos = {} as ToDos;

  async ngOnInit() {
    const allTasks = await this.firebase.loadTasksFromFirebase();
    this.homeworkList = allTasks.filter(t => t.category === 'homework');
  }

  openPopup(task?: ToDos) {
    if (task) {
      // Bearbeiten
      this.currentTask = { ...task };
    } else {
      // Neu anlegen
      this.currentTask = {
        id: '',
        title: '',
        description: '',
        category: 'homework',
        priority: 0,
        deadline: '',
        done: false,
        duration: 60,
        frequency: '',
      };
    }
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
  }

  async saveTask(task: ToDos) {
    await this.firebase.addTask(task);
    const allTasks = await this.firebase.loadTasksFromFirebase();
    this.homeworkList = allTasks.filter(t => t.category === 'homework');
    this.closePopup();
  }

  trackById(index: number, item: ToDos) {
    return item.id;
  }
}

