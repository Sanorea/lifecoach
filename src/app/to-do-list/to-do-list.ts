import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../services/firebase';
import { ToDos } from '../interfaces/to-dos.interface';
import { TodoPopupComponent } from './todo-popup/todo-popup';
import { PersonalBlocker } from '../personal-blocker/personal-blocker';


@Component({
  selector: 'app-to-do-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TodoPopupComponent, PersonalBlocker],
  templateUrl: './to-do-list.html',
  styleUrls: ['./to-do-list.scss']
})
export class ToDoList {
  firebase = inject(FirebaseService);

  toDoList: ToDos[] = [];
  toDosDone: ToDos[] = [];

  showPopup = false;
  currentTask: ToDos = {} as ToDos;

  async ngOnInit() {

    const allTasks = await this.firebase.loadTasksFromFirebase();
    const allowedCategories = ['To-Do', 'To-Do - dringend', 'Admin'];

    this.toDoList = allTasks.filter(
      t => !t.done && allowedCategories.includes(t.category)
    );
    this.toDosDone = allTasks.filter(
      t => t.done && allowedCategories.includes(t.category)
    );

  }


  openPopup() {
    this.currentTask = {
      id: '',
      title: '',
      description: '',
      category: '',
      priority: 0,
      deadline: '',
      done: false,
      duration: 60,
      frequency: '',
      earliest: '',
    };
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
  }

  async saveTask(task: ToDos) {
    await this.firebase.addTask(task);
    const allTasks = await this.firebase.loadTasksFromFirebase();

    const allowedCategories = ['To-Do', 'To-Do - dringend', 'Admin'];

    this.toDoList = allTasks.filter(
      t => !t.done && allowedCategories.includes(t.category)
    );
    this.toDosDone = allTasks.filter(
      t => t.done && allowedCategories.includes(t.category)
    );

    this.closePopup();
  }

  private async refreshLists() {
    const allTasks = await this.firebase.loadTasksFromFirebase();
    const allowedCategories = ['To-Do', 'To-Do - dringend', 'Admin'];

    this.toDoList = allTasks.filter(
      t => !t.done && allowedCategories.includes(t.category)
    );
    this.toDosDone = allTasks.filter(
      t => t.done && allowedCategories.includes(t.category)
    );
  }

  async deleteToDo(id: string) {
    await this.firebase.deleteTask(id);
    await this.refreshLists();
  }




  toggleDone(task: ToDos) {
    task.done = !task.done;

    if (task.done) {
      // Von offenen in erledigt verschieben
      this.toDoList = this.toDoList.filter(t => t.id !== task.id);
      this.toDosDone.push(task);
    } else {
      // Von erledigt zurück in offen verschieben
      this.toDosDone = this.toDosDone.filter(t => t.id !== task.id);
      this.toDoList.push(task);
    }

    // Firebase aktualisieren
    this.firebase.updateTask(task);
  }

  trackById(index: number, item: ToDos) {
    return item.id;
  }
}
