import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

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

  constructor(private router: Router, private apiService: ApiService) {}

  onLogin() {
    this.errorMessage = '';
    this.isLoading = true;

    this.apiService.login(this.email, this.password)
    .then(data => {
      this.isLoading = false;
      if (data.status === 'success') {
        this.apiService.setApiKey(data.data.apikey);
        localStorage.setItem('userType', data.data.type);
        localStorage.setItem('userName', data.data.name);
        localStorage.setItem('userId', data.data.id);

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
