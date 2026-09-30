import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthModalComponent } from './shared/auth-modal/auth-modal';
import { ToastContainerComponent } from './shared/toast-container/toast-container';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AuthModalComponent, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}