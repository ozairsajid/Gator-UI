import {Component, OnInit, EventEmitter, Output, Inject, NgModule, ChangeDetectorRef} from '@angular/core';
import {Router, ActivatedRoute} from '@angular/router';
import {GitService, CustomEvent} from '../git-service';
import {Route} from '@angular/compiler/src/core';
import {LOCAL_STORAGE, WebStorageService} from 'angular-webstorage-service';
import Quill from 'quill';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-status-reports',
  templateUrl: './status-reports.component.html',
  styleUrls: ['./status-reports.component.less'],
})
export class StatusReportsComponent implements OnInit {
  srList: any[];
  srReviewList: any[];
  textReviewer: string = '';
  textStatus: string = '';
  bShowReviewers: number = -1;
  bShowGitPR: number = -1;
  bShowJira: number = -1;
  currentOrg: string;
  eventSub: any;
  srId: number = -1; //Has to be -1 to be a insert else it will be update
  manager: string;
  managerComment: string;
  managerStatus: number;
  status: number;
  quillDisable: boolean = true;
  bInReview: boolean = false;
  bClosedReport: boolean = false;
  bNoSave: Boolean = true;
  bNoSendBack: Boolean = true;
  prevStatus: number = 0;
  comingFromStatusReportWindow: boolean = false;
  quillManagerDisable : boolean = false;
  //status -- 1=inProgress, 2=InReviw, 3=closed 4=Rejected 5=Archived
  IN_PROGRESS: number = 1;
  IN_REVIEW: number = 2;
  CLOSED: number = 3;
  REJECTED: number = 4;
  ARCHIVED: number = 5;

  constructor(private gitService: GitService, private router: Router, private cdRef: ChangeDetectorRef) {
    this.currentOrg = this.gitService.currentOrg;
    this.textReviewer = '';
    this.textStatus = '';
  }

  ngOnInit() {
    this.status = this.IN_PROGRESS;
    this.srId = -1;
    this.currentOrg = this.gitService.currentOrg;
    this.srList = [];
    this.srReviewList = [];

    this.textStatus = '';
    this.textReviewer = '';
    this.getReports4User();
    this.quillDisable = false;
    this.eventSub = this.gitService.onCustomEvent.subscribe((val: CustomEvent) => {
      if (val.source === 'TOP-DEVELOPER') {
        if (val.destination === 'STATUS-REPORT') {
          this.textReviewer = this.textReviewer + val.message + ',';
        }
      }

      if (val.source === 'GIT') {
        if ((val.destination = 'STATUS-REPORT')) this.textStatus = val.message + ' <br /> ' + this.textStatus;
      }

      if (val.source === 'JIRA') {
        if ((val.destination = 'STATUS-REPORT')) this.textStatus = val.message + ' <br /> ' + this.textStatus;
      }
    });
  }

  getReportData4Review(id: number) {
    //hide submit button and show close in its place
    this.bInReview = true;
    this.comingFromStatusReportWindow = false;
    this.quillManagerDisable = false;
    this.getReportForId(id);
  }

  getReportData(id: number) {
    this.comingFromStatusReportWindow = true;
    this.bInReview = false;
    this.quillManagerDisable = true;
    this.getReportForId(id);
  }

  newReport() {
    this.srId = -1;
    this.status = this.IN_PROGRESS;
    this.currentOrg = this.currentOrg;
    this.textStatus = '';
    this.textReviewer = '';
    this.manager = '';
    this.managerComment = '';
    this.managerStatus = 0;
    this.quillDisable = false;

    this.bInReview = false;
    this.comingFromStatusReportWindow = false;
    this.bClosedReport = false;
    this.quillManagerDisable = true;
  }

  getReportForId(id: number) {
    this.gitService.getSR4Id(id, true).subscribe(val => {
      this.srId = val[0].SRId;
      this.status = val[0].Status;
      this.prevStatus = this.status;
      this.currentOrg = val[0].Org;
      this.textStatus = val[0].StatusDetails;
      this.textReviewer = val[0].Reviewer;
      this.manager = val[0].Manager;
      this.managerComment = val[0].ManagerComment;
      this.managerStatus = val[0].ManagerStatus;
      //status --  2=InReviw, 3=closed  5=Archived => cannot edit the original MSR
      this.quillDisable = this.status === this.IN_REVIEW || this.status === this.CLOSED || this.status === this.ARCHIVED;
      this.quillManagerDisable =  this.status === this.CLOSED || this.status === this.ARCHIVED || this.status === this.REJECTED;
      if (this.status === this.ARCHIVED || this.status === this.CLOSED) {
        this.bClosedReport = true;
      } else {
        this.bClosedReport = false;
      }

      if (this.status === this.IN_REVIEW) {
        this.bInReview = true;
        if (this.comingFromStatusReportWindow) {
          //it is in review and the user is seeing his own status report. He should not be able to save it or send back
          this.bNoSave = true;
          this.bNoSendBack = true;
        } else {
          this.bNoSave = false;
          this.bNoSendBack = false;
        }
      } else {
        this.bInReview = false;
      }
    });
  }

  getReports4User() {
    this.srList = [];
    this.srReviewList = [];

    this.quillDisable = false;
    this.gitService.getSR4User(this.gitService.getLoggedInGitDev().login, true).subscribe(val => {
      val.map(item => {
        //status -- 1=inProgress, 2=InReviw, 3=closed 4=Rejected 5=Archived
        switch (item.Status) {
          case 1:
            item.Status = 'In Progress';
            break;
          case 2:
            item.Status = 'In Review';
            break;
          case 3:
            item.Status = 'Closed';
            break;
          case 4:
            item.Status = 'Rejected';
            break;
          case 5:
            item.Status = 'Archived';
            break;
        }

        item.LastUpdated = item.LastUpdated.substring(0, 10);

        this.srList.push(item);
      });
    });

    //review reports
    this.gitService
      .GetSR4User4Review(
        this.gitService.getLoggedInGitDev().login,
        this.IN_REVIEW, //inreview
        true,
      )
      .subscribe(val => {
        val.map(x => {
          //status -- 1=inProgress, 2=InReviw, 3=closed 4=Rejected 5=Archived
          switch (x.Status) {
            case 1:
              x.Status = 'In Progress';
              break;
            case 2:
              x.Status = 'In Review';
              break;
            case 3:
              x.Status = 'Closed';
              break;
            case 4:
              x.Status = 'Rejected';
              break;
            case 5:
              x.Status = 'Archived';
              break;
          }
          x.LastUpdated = x.LastUpdated.substring(0, 10);
          this.srReviewList.push(x);
        });
      });
  }

  addReviewer() {
    this.bShowReviewers = 99;
  }

  addJiraTickets() {
    this.gitService.triggerCustomEvent({
      source: 'STATUS-REPORT',
      destination: 'JIRA',
      message: 'true',
    });
    this.gitService.triggerJira(this.gitService.getLoggedInGitDev().login);
    this.bShowJira = 99;
  }

  save() {
    if (!this.currentOrg) {
      alert('Please select an organization before you submit the report.');
      return;
    }

    if (this.prevStatus === this.IN_PROGRESS) {
      //if it is coming from In_progress then let it go
    } else {
      if (this.comingFromStatusReportWindow && this.status === this.IN_REVIEW) {
        alert('Report is In-Review, you cannot edit it. Ask your reviewer to send it back to you to edit it.');
        return;
      }
    }

    this.gitService
      .saveMSR(
        this.srId,
        this.gitService.getLoggedInGitDev().login,
        this.currentOrg,
        this.textStatus,
        this.textReviewer,
        this.status, //status -- 1=inProgress, 2=InReviw, 3=closed 4=Rejected 5=Archived
        '', //links
        this.manager,
        this.managerComment,
        this.managerStatus,
      )
      .subscribe(v => {
        console.log(v);
        this.getReports4User();
      });
  }

  submit() {
    if (confirm('Once you submit you can not edit the report afterwards.')) {
      this.status = this.IN_REVIEW;
      this.save();
    }
  }

  close() {
    if (this.comingFromStatusReportWindow && this.status === this.IN_REVIEW) {
      alert('You cannot close this report. Report has to be in Review to be closed. Add Reviewer and ask them to close this report.');
      return;
    }

    if (confirm('Once you submit you can not edit the report afterwards.')) {
      this.status = this.CLOSED; //status -- 1=inProgress, 2=InReviw, 3=closed 4=Rejected 5=Archived
      this.save();
    }
  }

  sendBack() {
    if (this.comingFromStatusReportWindow && this.status === this.IN_REVIEW) {
      alert('You cannot send this report back. Only Reiver can send back the report.');
      return;
    }
    this.status = this.IN_PROGRESS; //Go back to start
    this.save();
  }

  addGitPR() {
    this.gitService.triggerCustomEvent({
      source: 'STATUS-REPORT',
      destination: 'TOP-DEVELOPER',
      message: 'true',
    });
    let dev = this.gitService.getLoggedInGitDev();
    this.gitService.trigger(dev.login);
    this.bShowGitPR = 99;
  }

  comingSoon() {
    alert('Coming soon ...');
  }

  onDestroy() {
    this.eventSub.unsubscribe();
    this.cdRef.detach();
  }

  hide() {
    this.bShowReviewers = -1;
    this.bShowGitPR = -1;
    this.bShowJira = -1;
  }

  downloadPDF() {
    const PDF_TYPE = 'application/pdf';
    const PDF_EXTENSION = '.pdf';
    const byteCharacters = atob(btoa(this.textStatus + '<br /> ------------- Manager Comment ---------------<br />' + this.managerComment));
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {type: PDF_TYPE});

    FileSaver.saveAs(blob, 'MSR-' + new Date().getDay() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getFullYear() + '.html');
  }
}
