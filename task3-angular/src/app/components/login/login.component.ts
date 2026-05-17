import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WebsocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  serverPort: number = 3000;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private wsService: WebsocketService
  ) {}

  onLogin() {
    this.errorMessage = '';
    this.isLoading = true;

    this.apiService.login(this.email, this.password)
    .then(data => {
      this.isLoading = false;
      if (data.status === 'success') {
        // Store user info
        this.apiService.setApiKey(data.data.apikey);
        localStorage.setItem('userType', data.data.type);
        localStorage.setItem('userName', data.data.name);
        localStorage.setItem('userId', data.data.id);

        // Connect to WebSocket server then send LOGIN message
        this.wsService.connect(this.serverPort);
        this.apiService.setWsPort(this.serverPort);


        // Wait for connection then authenticate
        const statusSub = this.wsService.connectionStatus$.subscribe(connected => {
          if (connected) {
            this.wsService.send({
              type: 'LOGIN',
              username: this.email,
              password: this.password
            });
            statusSub.unsubscribe();
          }
        });

        // Route based on role
        if (data.data.type === 'ATC') {
          this.router.navigate(['/atc']);
        } else {
          this.router.navigate(['/passenger']);
        }
      } else {
        this.errorMessage = data.data || 'Login failed';
      }
    })
    .catch(() => {
      this.isLoading = false;
      this.errorMessage = 'Could not connect to server';
    });
  }
}


