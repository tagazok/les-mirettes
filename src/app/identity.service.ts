import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';

export interface Identity {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
}

@Injectable()
export class IdentityService {
    private _$identity: BehaviorSubject<Identity | null> = new BehaviorSubject(null);

    public get $identity(): Observable<Identity> {
        return this._$identity as Observable<Identity>;
    }

    public setIdentity(identity: Identity | null) {
        this._$identity.next(identity);
    }
}