import { Component, inject } from '@angular/core';
import { FirebaseService } from '../services/firebase';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [RouterModule],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss'
})
export class LandingPage {

  firebase = inject(FirebaseService)

  ngOnInit () {
    this.firebase.loadTasksFromFirebase();
  }

}
