import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { PassengerViewComponent } from './components/passenger-view/passenger-view.component';
import { AtcViewComponent } from './components/atc-view/atc-view.component';
import { MapComponent } from './components/map/map.component';
import { WebsocketComponent } from './components/websocket/websocket.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    PassengerViewComponent,
    AtcViewComponent,
    MapComponent,
    WebsocketComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
