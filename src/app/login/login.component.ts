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

    // this.afAuth.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    // .then(function(result) {
    //   // The firebase.User instance:
    //   var user = result.user;
    //   // The Facebook firebase.auth.AuthCredential containing the Facebook
    //   // access token:
    //   var credential = result.credential;
    // }, function(error) {
    //   // The provider's account email, can be used in case of
    //   // auth/account-exists-with-different-credential to fetch the providers
    //   // linked to the email:
    //   var email = error.email;
    //   // The provider's credential:
    //   var credential = error.credential;
    // });
  }
}
