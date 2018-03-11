import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';
import { AngularFireDatabase, AngularFireObject, AngularFireList } from 'angularfire2/database';
import * as moment from 'moment';

@Component({
  selector: 'app-request',
  templateUrl: './request.component.html',
  styleUrls: ['./request.component.css']
})
export class RequestComponent implements OnInit {
  title = 'app';
  sejourForm: FormGroup;
  requestsRef: AngularFireList<any>;
  pricePerNight = 3;
  members: Array<String> = [];

  constructor(public authService: AuthService,
              private fb: FormBuilder,
              private db: AngularFireDatabase) {
    this.createForm();
    this.requestsRef = db.list('requests');
    this.members.push(this.authService.user.displayName);
  }

  ngOnInit() {
  }

  createForm() {
    this.sejourForm = this.fb.group({
      member: [{value: this.authService.user.displayName, disabled: true}, Validators.required ],
      start: ['', Validators.required ],
      end: ['', Validators.required ],
      nb: ['', Validators.required ],
    });
  }

  nbNights() {
    const s = moment(this.sejourForm.value.start);
    const e = moment(this.sejourForm.value.end);
    return e.diff(s, 'days') || 0;
  }

  totalPrice() {
    return this.nbNights() * this.sejourForm.value.nb * this.pricePerNight || 0
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

  signOut() {
    this.authService.signOut();
  }
}
