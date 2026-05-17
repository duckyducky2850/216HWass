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

    const bearing = position.bearing || 0;

    const aircraftIcon = L.divIcon({
      html: `<img src="assets/plane.png" style="width:40px;height:40px;transform:rotate(${bearing -50}deg);">`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (!this.aircraftMarker) {
      this.aircraftMarker = L.marker(
        [position.latitude, position.longitude],
        { icon: aircraftIcon }
      ).addTo(this.map);
    } else {
      this.aircraftMarker.setLatLng([position.latitude, position.longitude]);
      this.aircraftMarker.setIcon(aircraftIcon);
    }
  }


  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  animateFlight(originLat: number, originLon: number, destLat: number, destLon: number, durationSeconds: number) {
    const startTime = Date.now();
    const bearing = this.calculateBearing(originLat, originLon, destLat, destLon);

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / durationSeconds, 1);

      const currentLat = originLat + (destLat - originLat) * progress;
      const currentLon = originLon + (destLon - originLon) * progress;

      this.updateAircraftPosition({
        latitude: currentLat,
        longitude: currentLon,
        bearing: bearing
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        console.log('Flight reached destination');
      }
    };

    requestAnimationFrame(animate);

  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;

    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  testAnimation() {
    // JNB to CPT
    this.animateFlight(-26.1392, 28.2460, -33.9648, 18.6017, 10);
  }


}

