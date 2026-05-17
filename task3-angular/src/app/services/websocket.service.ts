import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  private socket: WebSocket | null = null;
  
  // These are like "radio channels" - components subscribe to listen
  public messages$ = new Subject<any>();
  public connectionStatus$ = new Subject<boolean>();

  constructor() {}

  connect(port: number) {
    const url = `ws://localhost:${port}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.connectionStatus$.next(true);
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messages$.next(data);
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.connectionStatus$.next(false);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connectionStatus$.next(false);
    };
  }

  send(message: object) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

