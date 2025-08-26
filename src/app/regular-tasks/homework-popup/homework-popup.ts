import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ToDos } from '../../interfaces/to-dos.interface';
import { FormsModule, NgModel } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-homework-popup',
  imports: [FormsModule, CommonModule],
  templateUrl: './homework-popup.html',
  styleUrl: './homework-popup.scss'
})
export class HomeworkPopup {
  @Input() showPopup = false;
  @Input() task: ToDos = {} as ToDos;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<ToDos>();

  frequencies = [
    'täglich',
    '2x pro Woche',
    '1x pro Woche',
    '2x pro Monat',
    '1x pro Monat',
    '2x pro Jahr',
    '1x pro Jahr'
  ];

  handleSave() {
    if (!this.task.title) {
      alert('Bitte einen Titel eingeben');
      return;
    }
    if (!this.task.frequency) {
      alert('Bitte eine Frequenz auswählen');
      return;
    }

    this.save.emit(this.task);
  }

  handleClose() {
    this.close.emit();
  }
}
