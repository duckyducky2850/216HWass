import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-passenger-view',
  templateUrl: './passenger-view.component.html',
  styleUrls: ['./passenger-view.component.css']
})
export class PassengerViewComponent implements OnInit, OnDestroy {

  userName: string = localStorage.getItem('userName') || 'Passenger';
  flights: any[] = [];
  airports: any[] = [];
  flightPosition: any = null;
  trackedFlightId: number | null = null;

  showBoardingNotification: boolean = false;
  boardingFlightId: number | null = null;
  boardingCountdown: number = 60;
  private countdownInterval: any = null;

  isConnected: boolean = false;
  connectionError: string = '';
  isLoading: boolean = true;
  errorMessage: string = '';

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

    // Load flights and airports in parallel
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
      case 'BOARDING_CALL':
        if (this.flights.some(f => f.id === message.flight_id)) {
          this.showBoardingAlert(message.flight_id);
          // Update flight status in list
          const boardingFlight = this.flights.find(f => f.id === message.flight_id);
          if (boardingFlight) boardingFlight.status = 'Boarding';
        }
        break;
      case 'POSITION':
        this.flightPosition = {
          latitude: message.latitude,
          longitude: message.longitude,
          bearing: message.bearing || 0
        };
        // Update flight status
        const flight = this.flights.find(f => f.id === message.flight_id);
        if (flight) flight.status = message.status;
        break;
      case 'LANDED':
        const landedFlight = this.flights.find(f => f.id === message.flight_id);
        if (landedFlight) landedFlight.status = 'Landed';
        this.flightPosition = null;
        break;
      case 'SHUTDOWN':
        this.connectionError = 'Server is shutting down.';
        break;
      case 'KILLED':
        this.connectionError = 'You have been removed from the server.';
        break;
      case 'ERROR':
        this.errorMessage = message.message || 'An error occurred.';
        break;
    }
  }


  showBoardingAlert(flightId: number) {
    this.boardingFlightId = flightId;
    this.showBoardingNotification = true;
    this.boardingCountdown = 60;

    this.countdownInterval = setInterval(() => {
      this.boardingCountdown--;
      if (this.boardingCountdown <= 0) {
        clearInterval(this.countdownInterval);
        this.showBoardingNotification = false;
      }
    }, 1000);
  }

  confirmBoarding() {
    this.apiService.boardFlight(this.boardingFlightId!)
    .then(data => {
      if (data.status === 'success') {
        this.wsService.send({
          type: 'BOARD',
          flight_id: this.boardingFlightId,
          apikey: localStorage.getItem('apikey')
        });
      } else {
        this.errorMessage = data.data || 'Could not confirm boarding.';
      }
    });
    clearInterval(this.countdownInterval);
    this.showBoardingNotification = false;
  }

  trackFlight(flightId: number) {
    this.trackedFlightId = flightId;
    this.wsService.send({
      type: 'TRACK',
      flight_id: flightId,
      apikey: localStorage.getItem('apikey')
    });
  }

  ngOnDestroy() {
    if (this.messageSub) this.messageSub.unsubscribe();
    if (this.statusSub) this.statusSub.unsubscribe();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }
}

