import { Component, OnInit } from '@angular/core';
import { AngularFireDatabase, AngularFireList } from "angularfire2/database";
import { Observable } from "rxjs/Observable";
import * as moment from "moment";
import { AuthService } from '../auth.service';
@Component({
  selector: 'app-my-requests',
  templateUrl: './my-requests.component.html',
  styleUrls: ['./my-requests.component.css']
})
export class MyRequestsComponent implements OnInit {
  requests: Observable<any[]>;
  user: any;

  constructor(private db: AngularFireDatabase,
              private as: AuthService) {
    this.user = as.user
    this.requests = db.list(`users/${this.user.uid}/requests`).valueChanges();
  }

  ngOnInit() {
  }

  getDateRange(request) {
    const start = moment(request.startDate).format("MMMM");
    const end = moment(request.endDate).format("MMMM");
    if (start === end) return start;
    return `${start} - ${end}`;
  }

  chanteStatus(request, status) {
    this.db.object(`requests/${request.key}/status`).set(status);
  }

}
