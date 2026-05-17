import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-passenger-view',
  templateUrl: './passenger-view.component.html',
  styleUrls: ['./passenger-view.component.css']
})
export class PassengerViewComponent implements OnInit, OnDestroy {

  userName: string = localStorage.getItem('userName') || 'Passenger';

  flights: any[] = [
    // Mock flights for now - will come from API later
    { id: 1, flight_number: 'SA203', origin_code: 'JNB', destination_code: 'CPT', status: 'Scheduled', flight_duration_hours: 2 },
    { id: 2, flight_number: 'SA101', origin_code: 'CPT', destination_code: 'DUR', status: 'Scheduled', flight_duration_hours: 1.5 }
  ];

  // Boarding notification
  showBoardingNotification: boolean = false;
  boardingFlightId: number | null = null;
  boardingCountdown: number = 60;
  private countdownInterval: any = null;

  // Connection status
  isConnected: boolean = false;
  connectionError: string = '';

  // Like listeners
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
      case 'BOARDING_CALL':
        this.showBoardingAlert(message.flight_id);
        break;
      case 'POSITION':
        // Will handle map updates here later
        console.log('Position update:', message);
        break;
      case 'SHUTDOWN':
        this.connectionError = 'Server is shutting down.';
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
    this.wsService.send({
      type: 'BOARD',
      flight_id: this.boardingFlightId,
      apikey: localStorage.getItem('apikey')
    });
    clearInterval(this.countdownInterval);
    this.showBoardingNotification = false;
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
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }
}
