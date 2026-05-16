import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private router: Router) {}

  onLogin() {
    this.errorMessage = '';
    this.isLoading = true;

    const body = {
      type: 'Login',
      email: this.email,
      password: this.password
    };

    fetch('http://wheatley.cs.up.ac.za/u25368037/api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(res=> res.json())
    .then(data => {
      this.isLoading = false;
      if (data.status === 'success') {
        localStorage.setItem('apikey', data.data.apikey);
        localStorage.setItem('userType', data.data.type);
        localStorage.setItem('userName', data.data.name);
        localStorage.setItem('userID', data.data.email);

        if (data.data.type === 'ATC'){
          this.router.navigate(['/atc']);
        } else {
          this.router.navigate(['/passenger']);
        }
      } else {
        this.errorMessage = data.message || 'Login failed.';
      }
    }).catch(() => {
      this.isLoading = false;
      this.errorMessage = 'Could not connect to server';
    });
  }
}
