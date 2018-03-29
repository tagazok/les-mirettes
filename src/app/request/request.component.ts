import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';
import { AngularFireDatabase, AngularFireObject, AngularFireList } from 'angularfire2/database';
import * as moment from 'moment';
import { MatSnackBar } from '@angular/material/snack-bar';

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
              private db: AngularFireDatabase,
              public snackBar: MatSnackBar) {
    this.createForm();
    this.requestsRef = db.list(`users/${this.authService.user.uid}/requests`);
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
      member: this.authService.user.providerData[0],
      nbPersons: this.sejourForm.value.nb,
      startDate: this.sejourForm.value.start.toString(),
      endDate: this.sejourForm.value.end.toString(),
      nbNights: this.nbNights(),
      totalPrice: this.totalPrice(),
    }
    debugger;
    this.requestsRef.push(request);
    this.sejourForm.reset();
    this.snackBar.open("Demande bien envoyée! :)", "", {
      duration: 1500,
    });
    // this.router.navigate(['/dashboard/my-requests'])
  }

  signOut() {
    this.authService.signOut();
  }
}
