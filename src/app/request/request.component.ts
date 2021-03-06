import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';
import { AngularFireDatabase, AngularFireObject, AngularFireList } from 'angularfire2/database';
import * as moment from 'moment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

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
              public snackBar: MatSnackBar,
              private router: Router) {
    this.createForm();
    this.requestsRef = db.list(`users/${this.authService.user.uid}/requests`);
    this.members.push(this.authService.user.displayName);
  }

  ngOnInit() {
  }

  createForm() {
    this.sejourForm = this.fb.group({
      member: [{value: this.authService.user.displayName, disabled: true}, Validators.required ],
      start: [{value: '', disabled: true }, Validators.required ],
      end: [{value: '', disabled: true }, Validators.required ],
      nb: ['', Validators.required ],
    });
  }

  nbNights() {
    const s = moment(this.sejourForm.controls.start.value);
    const e = moment(this.sejourForm.controls.end.value);
    return e.diff(s, 'days') || 0;
  }

  totalPrice() {
    return this.nbNights() * this.sejourForm.value.nb * this.pricePerNight || 0
  }
  add() {
    const request = {
      member: {
        uid: this.authService.user.uid.toString(),
        displayName: this.authService.user.displayName.toString(),
        email: this.authService.user.email
      },
      nbPersons: this.sejourForm.value.nb,
      startDate: `${this.sejourForm.controls.start.value.getFullYear()}-${this.sejourForm.controls.start.value.getMonth() + 1}-${this.sejourForm.controls.start.value.getDate()}`,
      endDate: `${this.sejourForm.controls.end.value.getFullYear()}-${this.sejourForm.controls.end.value.getMonth() + 1}-${this.sejourForm.controls.end.value.getDate()}`,
      nbNights: this.nbNights(),
      totalPrice: this.totalPrice(),
    }
    
    this.requestsRef.push(request);
    this.sejourForm.reset();
    this.snackBar.open("Demande bien envoyée! :)", "", {
      duration: 1500,
    });
    this.router.navigate(['/dashboard/my-requests'])
  }

  signOut() {
    this.authService.signOut();
  }
}
