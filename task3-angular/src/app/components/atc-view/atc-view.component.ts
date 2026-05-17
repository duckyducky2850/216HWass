import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-atc-view',
  templateUrl: './atc-view.component.html',
  styleUrls: ['./atc-view.component.css']
})
export class AtcViewComponent implements OnInit, OnDestroy {

  userName: string = localStorage.getItem('userName') || 'ATC';

  // Mock flights - will come from API later
  flights: any[] = [
    { id: 1, flight_number: 'SA203', origin_code: 'JNB', destination_code: 'CPT', status: 'Scheduled', flight_duration_hours: 2, passengers: [] },
    { id: 2, flight_number: 'SA101', origin_code: 'CPT', destination_code: 'DUR', status: 'Scheduled', flight_duration_hours: 1.5, passengers: [] },
    { id: 3, flight_number: 'SA305', origin_code: 'DUR', destination_code: 'JNB', status: 'In Flight', flight_duration_hours: 1, passengers: [] }
  ];

  selectedFlight: any = null;
  isConnected: boolean = false;
  connectionError: string = '';
  notifications: string[] = [];

  private messageSub: Subscription | null = null;
  private statusSub: Subscription | null = null;

  constructor(private wsService: WebsocketService) {}

  ngOnInit() {
    this.statusSub = this.wsService.connectionStatus$.subscribe(status => {
      this.isConnected = status;
      if (!status) {
        this.connectionError = 'Disconnected from server. Please refresh.';
      } else {
        this.connectionError = '';
      }
    });

    this.messageSub = this.wsService.messages$.subscribe(message => {
      this.handleMessage(message);
    });
  }

  handleMessage(message: any) {
    switch(message.type) {
      case 'BOARD':
        this.notifications.unshift(`Passenger confirmed boarding on flight ${message.flight_id}`);
        break;
      case 'POSITION':
        console.log('Position update:', message);
        break;
      case 'SHUTDOWN':
        this.connectionError = 'Server is shutting down.';
        break;
    }
  }

  selectFlight(flight: any) {
    this.selectedFlight = flight;
  }

  dispatchFlight(flight: any) {
    this.wsService.send({
      type: 'DISPATCH',
      flight_id: flight.id,
      apikey: localStorage.getItem('apikey')
    });
    
    flight.status = 'Boarding';
    this.notifications.unshift(`Dispatched flight ${flight.flight_number}`);
  }

  trackFlight(flightId: number) {
    this.wsService.send({
      type: 'TRACK',
      flight_id: flightId,
      apikey: localStorage.getItem('apikey')
    });
  }

  ngOnDestroy() {
    if (this.messageSub) this.messageSub.unsubscribe();
    if (this.statusSub) this.statusSub.unsubscribe();
  }
}

