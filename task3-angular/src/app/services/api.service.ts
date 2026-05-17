import { Injectable } from '@angular/core';

const API_URL = 'https://wheatley.cs.up.ac.za/u25368037/api.php';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiKey: string = '';

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('apikey', key);
  }

  getApiKey(): string {
    return this.apiKey || localStorage.getItem('apikey') || '';
  }

  private post(body: object): Promise<any> {
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(res => res.json());
  }

  login(email: string, password: string): Promise<any> {
    return this.post({ type: 'Login', email, password });
  }

  getAirports(): Promise<any> {
    return this.post({ type: 'GetAirports', apikey: this.getApiKey() });
  }

  getAllFlights(): Promise<any> {
    return this.post({ type: 'GetAllFlights', apikey: this.getApiKey() });
  }

  getFlight(flightId: number): Promise<any> {
    return this.post({ type: 'GetFlight', apikey: this.getApiKey(), flight_id: flightId });
  }

  boardFlight(flightId: number): Promise<any> {
    return this.post({ type: 'BoardFlight', apikey: this.getApiKey(), flight_id: flightId });
  }
}
