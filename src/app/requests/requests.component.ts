import { Component, OnInit } from "@angular/core";
import { AngularFireDatabase, AngularFireList } from "angularfire2/database";
import { Observable } from "rxjs/Observable";
import * as moment from "moment";

@Component({
  selector: "app-requests",
  templateUrl: "./requests.component.html",
  styleUrls: ["./requests.component.css"]
})
export class RequestsComponent implements OnInit {
  // requestsRef: AngularFireList<any>;
  requests: Observable<any[]>;

  constructor(private db: AngularFireDatabase) {
    // this.requests = db.list('requests').valueChanges()
    // .map(list => list.map((item: any) => ({

    //   // Map to a new item with all of the item's properties:
    //   ...item,

    //   // And replace the rootwords with an array:
    //   logs: Object.keys(item.logs || {})

    //     // Use reduce to build an array of values:
    //     .reduce((acc, key) => [...acc, item.logs[key]], [])
    //   })
    // ));
    this.requests = db
      .list("requests")
      .snapshotChanges()
      .map(request => {
        return request.map(c => ({ key: c.payload.key, ...c.payload.val() }));
      })
      .map(list =>
        list.map((item: any) => ({
          // Map to a new item with all of the item's properties:
          ...item,

          // And replace the rootwords with an array:
          logs: Object.keys(item.logs || {})

            // Use reduce to build an array of values:
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
