import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  private socket: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectTimeout: any = null;
  private port: number = 3000;

  public messages$ = new Subject<any>();
  public connectionStatus$ = new Subject<boolean>();
  public errorMessages$ = new Subject<string>();

  constructor() {}

  connect(port: number) {
    this.port = port;
    this._connect();
  }

  private _connect() {
    const url = `ws://localhost:${this.port}`;

    try {
      this.socket = new WebSocket(url);

      // Connection timeout - if no connection in 5 seconds
      const connectionTimeout = setTimeout(() => {
        if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
          this.socket.close();
          this.errorMessages$.next('Connection timed out. Is the server running?');
          this.connectionStatus$.next(false);
        }
      }, 5000);

      this.socket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.connectionStatus$.next(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      this.socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket disconnected');
        this.connectionStatus$.next(false);

        // Attempt reconnect if not intentional
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };

      this.socket.onerror = () => {
        clearTimeout(connectionTimeout);
        this.connectionStatus$.next(false);
        this.errorMessages$.next('WebSocket error. Could not connect to server.');
      };

    } catch (e) {
      this.errorMessages$.next('Could not create WebSocket connection.');
      this.connectionStatus$.next(false);
    }
  }

  private handleIncomingMessage(data: any) {
    // Handle error codes from server
    if (data.type === 'ERROR') {
      switch (data.code) {
        case 403:
          this.errorMessages$.next('Access denied: ' + (data.message || 'Forbidden'));
          break;
        case 404:
          this.errorMessages$.next('Not found: ' + (data.message || 'Resource not found'));
          break;
        default:
          this.errorMessages$.next(data.message || 'An error occurred');
      }
    }

    if (data.type === 'KILLED') {
      this.errorMessages$.next('You have been disconnected by the server administrator.');
      this.disconnect();
      this.connectionStatus$.next(false);
    }

    if (data.type === 'SHUTDOWN') {
      this.errorMessages$.next('Server is shutting down. Please try again later.');
      this.disconnect();
      this.connectionStatus$.next(false);
    }

    // Forward all messages to subscribers
    this.messages$.next(data);
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.errorMessages$.next('Could not reconnect after 3 attempts. Please refresh the page.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectAttempts * 2000;

    console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    this.errorMessages$.next(`Connection lost. Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this._connect();
    }, delay);
  }

  send(message: object) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.errorMessages$.next('Cannot send message: not connected to server.');
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.socket) {
      this.socket.close(1000);
      this.socket = null;
    }
  }
}
