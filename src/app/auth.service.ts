import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {AngularFireAuth} from 'angularfire2/auth';
import * as firebase from 'firebase/app';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/take';

import {FirebaseError} from 'firebase/app';


@Injectable()
export class AuthService {
  public user: firebase.User;
  public authState$: Observable<firebase.User>;

  constructor(private afAuth: AngularFireAuth) {
    this.user = null;
    this.authState$ = afAuth.authState;

    this.authState$.subscribe((user: firebase.User) => {
      this.user = user;

      console.log('authState$ changed', this.user);
    });
  }

  get authenticated(): boolean {
    return this.user !== null;
  }

  get id(): string {
    return this.authenticated ? this.user.uid : null;
  }

  signIn(): Promise<void> {
    let provider = new firebase.auth.GoogleAuthProvider();

    return firebase.auth()
      .signInWithPopup(provider)
      .then((result: firebase.auth.UserCredential) => {
        // The signed-in user info.
        this.user = result.user;
      }).catch((error: FirebaseError) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;

        console.error('ERROR @ AuthService#signIn() :', error);
      });
  }

  signInWithGoogle(): Promise<void> {
    return this.signIn();
  }

  signOut(): void {
    this.afAuth.auth.signOut();
  }
}

// @Injectable()
// export class AuthService {
//   constructor(
//     private afAuth: AngularFireAuth,
//     private router: Router) {}

//   googleLogin() {
//     const provider = new firebase.auth.GoogleAuthProvider();
//     return this.oAuthLogin(provider)
//       .then(value => {
//         debugger;
//         console.log('Sucess', value);
//         console.log('The given name is ' + value.additionalUserInfo.profile.given_name);
//         this.router.navigateByUrl('/request');
//       })
//       .catch(error => {
//         debugger;
//         console.log('Something went wrong: ', error);
//       });
//   }

//   logout() {
//     this.afAuth.auth.signOut().then(() => {
//       this.router.navigate(['/']);
//     });
//   }

//   private oAuthLogin(provider) {
//     return this.afAuth.auth.signInWithPopup(provider);
//   }

//   getCurrentUserToken(){
//     firebase.auth().currentUser.getToken()
//     .then(
//       (token: string) => {
//         localStorage.setItem('isLoggedIn', token);
//       }
//     )
//     localStorage.getItem('isLoggedIn');
//   }
//   isAuthenticated():Observable<boolean>{
//     debugger;
//     return this.afAuth.authState
//         .take(1)
//         .map(authState => !!authState)
//         .do(auth => !auth ? this.router.navigate(['/login']) : true);
//     // return (localStorage.getItem('isLoggedIn')) ? true : false;
//   }
// }