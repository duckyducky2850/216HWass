import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { PassengerViewComponent } from './components/passenger-view/passenger-view.component';
import { AtcViewComponent } from './components/atc-view/atc-view.component';
import { MapComponent } from './components/map/map.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'passenger', component: PassengerViewComponent },
  { path: 'atc', component: AtcViewComponent },
];

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    PassengerViewComponent,
    AtcViewComponent,
    MapComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule.forRoot(routes)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }


