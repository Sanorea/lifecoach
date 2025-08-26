import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToDos } from '../../interfaces/to-dos.interface';

@Component({
  selector: 'app-todo-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todo-popup.html',
  styleUrls: ['./todo-popup.scss']
})
export class TodoPopupComponent {
  @Input() showPopup = false;
  @Input() task: ToDos = {} as ToDos;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<ToDos>();

  onSave() {
    if (!this.task.title || !this.task.category || !this.task.deadline) {
      alert('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }
    this.save.emit(this.task);
  }

  onClose() {
    this.close.emit();
  }
}
