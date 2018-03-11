import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from 'angularfire2/auth';
import * as firebase from 'firebase/app';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  constructor(private authService: AuthService,
              private router: Router,) { }

  ngOnInit() {
  }

  loginGoogle() {
    // this.authService.googleLogin();
    this.authService.signInWithGoogle()
      .then(() => this.router.navigate(['/request']));
  }
}
