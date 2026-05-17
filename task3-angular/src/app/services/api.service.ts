import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;


@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiKey: string = '';
  private wsPort: number = 3000;

  setWsPort(port: number) {
    this.wsPort = port;
    localStorage.setItem('wsPort', port.toString());
  }

  getWsPort(): number {
    return this.wsPort || parseInt(localStorage.getItem('wsPort') || '3000');
  }


  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('apikey', key);
  }

  getApiKey(): string {
    return this.apiKey || localStorage.getItem('apikey') || '';
  }

  private post(body: object): Promise<any> {
    return fetch(environment.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    .then(res => res.text())
    .then(text => {
      console.log('Raw response:', text);
      return JSON.parse(text);
    })
    .catch(err => {
      console.error('Fetch error:', err);
      throw err;
    });
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
