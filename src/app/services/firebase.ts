import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore, collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ToDos } from "../interfaces/to-dos.interface";

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  db: Firestore;

  constructor() {
    const firebaseConfig = {
      apiKey: "AIzaSyAuBk9tI8aSvQaNkD-HnJjREMH53ZOd2PY",
      authDomain: "lifecoach-7aacd.firebaseapp.com",
      projectId: "lifecoach-7aacd",
      storageBucket: "lifecoach-7aacd.firebasestorage.app",
      messagingSenderId: "768924994334",
      appId: "1:768924994334:web:9b115ba335c0bbe373d70f",
      measurementId: "G-R1VCDWL1PR"
    };

    const app = initializeApp(firebaseConfig);
    this.db = getFirestore(app);
  }

  toDoList: ToDos[] = [];
  editingTaskId: string | null = null;

  newToDo: ToDos = {
    title: '',
    description: '',
    category: '',
    priority: 0,
    deadline: '',
    id: '0',
    duration: 60,
    frequency: '',
    earliest: '',
  }

  async loadTasksFromFirebase() {
    const taskCollection = collection(this.db, 'toDo');
    const snapshot = await getDocs(taskCollection);
    this.toDoList = snapshot.docs.map((docSnap): ToDos => ({
      ...(docSnap.data() as ToDos),
      id: docSnap.id // wichtig, sonst fehlt die Firestore-ID
    }));
    console.log('toDoList :>> ', this.toDoList);
    return this.toDoList;
  }

  editTask(item: ToDos) {
    this.newToDo = { ...item };
    this.editingTaskId = item.id?.toString() ?? null;
  }

  async saveTask() {
    if (!this.newToDo.title) {
      alert('Bitte Titel eingeben');
      return;
    }
    try {
      if (this.editingTaskId) {
        const docRef = doc(this.db, 'toDo', this.editingTaskId);
        const { id, ...data } = this.newToDo;
        await updateDoc(docRef, data);
        console.log('Task aktualisiert');
      } else {
        const docRef = await addDoc(collection(this.db, 'toDo'), this.newToDo);
        console.log('Neuer Task hinzugefügt: ', docRef.id);
      }
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
    }
  }

  async updateTask(task: ToDos) {
    if (!task.id) return;
    const { id, ...data } = task;
    const docRef = doc(this.db, 'toDo', id);
    await updateDoc(docRef, data);
  }

  async addTask(task: ToDos) {
    const docRef = await addDoc(collection(this.db, 'toDo'), task);
    console.log('Neuer Task hinzugefügt: ', docRef.id);
  }

  async deleteTask(id: string): Promise<void> {
    if (!id) {
      throw new Error('Task ID is required for deletion');
    }
    const taskDocRef = doc(this.db, `toDo/${id}`);
    await deleteDoc(taskDocRef);
    console.log('gelöscht');
    console.log(id);

  }

  // 👉 Hilfsfunktionen für Kategorien
  getHomeworkTasks(): ToDos[] {
    return this.toDoList.filter(t => t.category === 'homework');
  }

  getToDoTasks(): ToDos[] {
    return this.toDoList.filter(t =>
      t.category === 'To-Do' ||
      t.category === 'To-Do - dringend' ||
      t.category === 'Admin'
    );
  }

  getTerminblocker(): ToDos[] {
    return this.toDoList.filter(t => t.category === 'Terminblocker');
  }

  // Alle in gewünschter Reihenfolge (Landing/Daily Plan)
  getAllOrderedTasks(): ToDos[] {
    return [
      ...this.getTerminblocker(),
      ...this.getHomeworkTasks(),
      ...this.getToDoTasks(),
    ];
  }



}
