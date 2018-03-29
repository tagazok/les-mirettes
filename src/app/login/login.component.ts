import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from 'angularfire2/auth';
import * as firebase from 'firebase/app';
import { AuthService } from '../auth.service';
import { AngularFireDatabase } from 'angularfire2/database';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  constructor(private authService: AuthService,
              private router: Router,
              private db: AngularFireDatabase) { }

  ngOnInit() {
  }

  loginGoogle() {
    // this.authService.googleLogin();
    this.authService.signInWithGoogle()
      .then(() => {
        const user = this.authService.user;
        this.db.object(`users/${user.uid}/admin`).valueChanges().subscribe(admin => {
          if (admin === true) {
            window.localStorage.setItem('admin', "true");
            this.authService.admin = true;
          }
        });
      })
      .then(() => this.router.navigate(['/dashboard/my-requests']));
  }
}
