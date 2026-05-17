import { Component, OnInit, OnDestroy, Input, SimpleChanges, OnChanges } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnDestroy, OnChanges {

  @Input() airports: any[] = [];
  @Input() flightPosition: any = null;

  private map: L.Map | null = null;
  private airportMarkers: L.Marker[] = [];
  private aircraftMarker: L.Marker | null = null;

  private airportIcon = L.icon({
    iconUrl: 'assets/airport.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  private aircraftIcon = L.icon({
    iconUrl: 'assets/plane.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });

  private mockAirports = [
    { name: 'OR Tambo', iata_code: 'JNB', latitude: -26.1392, longitude: 28.2460 },
    { name: 'Cape Town International', iata_code: 'CPT', latitude: -33.9648, longitude: 18.6017 },
    { name: 'King Shaka', iata_code: 'DUR', latitude: -29.6144, longitude: 31.1197 },
    { name: 'Heathrow', iata_code: 'LHR', latitude: 51.4700, longitude: -0.4543 },
    { name: 'JFK', iata_code: 'JFK', latitude: 40.6413, longitude: -73.7781 }
  ];

  ngOnInit() {
    this.initMap();
    this.plotAirports(this.mockAirports);
  }

  private initMap() {
    this.map = L.map('map', {
      center: [0, 20],
      zoom: 3
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private plotAirports(airports: any[]) {
    if (!this.map) return;

    airports.forEach(airport => {
      const marker = L.marker(
        [airport.latitude, airport.longitude],
        { icon: this.airportIcon }
      )
      .addTo(this.map!)
      .bindPopup(`<b>${airport.iata_code}</b><br>${airport.name}`);
      this.airportMarkers.push(marker);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['flightPosition'] && this.map) {
      this.updateAircraftPosition(changes['flightPosition'].currentValue);
    }
    if (changes['airports'] && this.airports.length > 0) {
      this.plotAirports(this.airports);
    }
  }

  updateAircraftPosition(position: any) {
    if (!this.map || !position) return;

    if (!this.aircraftMarker) {
      this.aircraftMarker = L.marker(
        [position.latitude, position.longitude],
        { icon: this.aircraftIcon }
      ).addTo(this.map);
    } else {
      this.aircraftMarker.setLatLng([position.latitude, position.longitude]);
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}

