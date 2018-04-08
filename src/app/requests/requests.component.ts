import { Component, OnInit } from "@angular/core";
import { AngularFireDatabase, AngularFireList } from "angularfire2/database";
import { Observable } from "rxjs/Observable";
import * as moment from "moment";
import { AuthService } from "../auth.service";

@Component({
  selector: "app-requests",
  templateUrl: "./requests.component.html",
  styleUrls: ["./requests.component.css"]
})
export class RequestsComponent implements OnInit {
  // requestsRef: AngularFireList<any>;
  requests: Observable<any[]>;
  private status = {
    "PENDING": "En attente",
    "ACCEPTED": "Accepté",
    "PAID": "Payé",
    "REFUSED": "Refusé"
  };

  constructor(private db: AngularFireDatabase,
              private authService: AuthService) {
   
    this.requests = db
      .list("requests")
      .snapshotChanges()
      .map(request => {
        return request.map(c => ({ key: c.payload.key, ...c.payload.val() }));
      })
      .map(list =>
        list.map((item: any) => ({
          ...item,
          logs: Object.keys(item.logs || {})
            .reduce((acc, key) => [...acc, item.logs[key]], [])
        }))
      );
  }

  ngOnInit() {}

  getDateRange(request) {
    const start = moment(request.startDate).format("MMMM");
    const end = moment(request.endDate).format("MMMM");
    if (start === end) return start;
    return `${start} - ${end}`;
  }

  chanteStatus(request, status) {
    this.db.object(`requests/${request.key}/status`).set(status);
  }

  checkStatus(request, status) {
    
  }
}
