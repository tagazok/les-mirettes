import { Component, OnInit } from '@angular/core';
import { AngularFireDatabase, AngularFireList } from 'angularfire2/database';
import { Observable } from 'rxjs/Observable';
import * as moment from 'moment';

@Component({
  selector: 'app-requests',
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.css']
})
export class RequestsComponent implements OnInit {
  // requestsRef: AngularFireList<any>;
  requests: Observable<any[]>;
  
  constructor(private db: AngularFireDatabase) { 
    this.requests = db.list('requests').valueChanges();
  }

  ngOnInit() {
  }

  getDateRange(request) {
    const start = moment(request.startDate).format('MMMM');
    const end = moment(request.endDate).format('MMMM');
    if (start === end) return start;
    return `${start} - ${end}`;
  }

}
