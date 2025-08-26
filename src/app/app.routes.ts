import { Routes } from '@angular/router';
import { LandingPage } from './landing-page/landing-page';
import { ToDoList } from './to-do-list/to-do-list';
import { RegularTasks } from './regular-tasks/regular-tasks';
import { Report } from './report/report';
import { DailyPlan } from './daily-plan/daily-plan';

export const routes: Routes = [
    { path: '', component: LandingPage },
    { path: 'to-do-list', component: ToDoList },
    { path: 'regular-tasks', component: RegularTasks },
    { path: 'report', component: Report },
    { path: 'daily-plan', component: DailyPlan },
];
