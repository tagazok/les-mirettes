import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';
import { AngularFireDatabase, AngularFireObject, AngularFireList } from 'angularfire2/database';
import * as moment from 'moment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'app';
  sejourForm: FormGroup;
  members = ["Tiffany", "Kevin", "Patrick", "William", "Benjamin", "Catherine", "Steven"];

  requestsRef: AngularFireList<any>;
  pricePerNight = 3;

  constructor(private fb: FormBuilder, private db: AngularFireDatabase) {
    this.createForm();
    this.requestsRef = db.list('requests');
  }

  createForm() {
    this.sejourForm = this.fb.group({
      member: ['', Validators.required ],
      start: ['', Validators.required ],
      end: ['', Validators.required ],
      nb: ['', Validators.required ],
    });
  }

  nbNights() {
    const s = moment(this.sejourForm.value.start);
    const e = moment(this.sejourForm.value.end);
    return e.diff(s, 'days');
  }

  totalPrice() {
    return this.nbNights() * this.sejourForm.value.nb * this.pricePerNight;
  }
  add() {
    
    const request = {
      name: this.sejourForm.value.member,
      nbPersons: this.sejourForm.value.nb,
      startDate: this.sejourForm.value.start.toUTCString(),
      endDate: this.sejourForm.value.end.toUTCString(),
      nbNights: this.nbNights(),
      totalPrice: this.totalPrice(),
    }
    this.requestsRef.push(request);
  }
}
