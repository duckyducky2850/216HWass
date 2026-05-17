import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-atc-view',
  templateUrl: './atc-view.component.html',
  styleUrls: ['./atc-view.component.css']
})
export class AtcViewComponent implements OnInit, OnDestroy {

  userName: string = localStorage.getItem('userName') || 'ATC';
  flights: any[] = [];
  airports: any[] = [];
  flightPosition: any = null;
  selectedFlight: any = null;

  isConnected: boolean = false;
  connectionError: string = '';
  isLoading: boolean = true;
  errorMessage: string = '';
  notifications: string[] = [];

  wsError: string = '';

  private messageSub: Subscription | null = null;
  private statusSub: Subscription | null = null;

  constructor(private wsService: WebsocketService, private apiService: ApiService) {}

  ngOnInit() {
    this.loadData();

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

    this.wsService.errorMessages$.subscribe(error => {
      this.wsError = error;
    });

  }

  loadData() {
    this.isLoading = true;

    Promise.all([
      this.apiService.getAllFlights(),
      this.apiService.getAirports()
    ])
    .then(([flightsData, airportsData]) => {
      this.isLoading = false;

      if (flightsData.status === 'success') {
        this.flights = flightsData.data;
      } else {
        this.errorMessage = 'Could not load flights.';
      }

      if (airportsData.status === 'success') {
        this.airports = airportsData.data;
      }
    })
    .catch(() => {
      this.isLoading = false;
      this.errorMessage = 'Could not connect to server.';
    });
  }

  handleMessage(message: any) {
    switch(message.type) {
      case 'BOARD':
        this.notifications.unshift(`Passenger confirmed boarding on flight ${message.flight_id}`);
        // Update passenger list in selected flight
        if (this.selectedFlight && this.selectedFlight.id === message.flight_id) {
          this.apiService.getFlight(message.flight_id).then(data => {
            if (data.status === 'success') {
              this.selectedFlight = data.data;
            }
          });
        }
        break;
      case 'POSITION':
        this.flightPosition = {
          latitude: message.latitude,
          longitude: message.longitude,
          bearing: message.bearing || 0
        };
        // Update flight status in list
        const flight = this.flights.find(f => f.id === message.flight_id);
        if (flight) {
          flight.status = message.status;
          flight.current_latitude = message.latitude;
          flight.current_longitude = message.longitude;
        }
        break;
      case 'NO_SHOW':
        this.notifications.unshift(`Passenger no-show on flight ${message.flight_id}`);
        break;
      case 'SHUTDOWN':
        this.connectionError = 'Server is shutting down.';
        break;
      case 'ERROR':
        this.errorMessage = message.message || 'An error occurred.';
        break;
    }
  }

  selectFlight(flight: any) {
    this.selectedFlight = null;
    // Fetch full flight details including passenger list
    this.apiService.getFlight(flight.id).then(data => {
      if (data.status === 'success') {
        this.selectedFlight = data.data;
      } else {
        this.errorMessage = data.data || 'Could not load flight details.';
      }
    });
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
