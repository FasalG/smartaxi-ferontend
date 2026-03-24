import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div *ngIf="show()" class="modal-backdrop fade show"></div>
    <div *ngIf="show()" class="modal fade show d-block" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div class="modal-body p-4 text-center">
            <div class="icon-circle mb-3 mx-auto" [ngClass]="typeClass()">
              <svg *ngIf="type === 'danger'" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              <svg *ngIf="type === 'warning'" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <svg *ngIf="type === 'info'" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h4 class="fw-bold text-navy mb-2">{{ title }}</h4>
            <p class="text-secondary mb-4">{{ message }}</p>
            <div class="d-flex gap-2 justify-content-center mt-2">
              <button type="button" class="btn btn-light rounded-pill px-4 py-2 fw-bold text-secondary" (click)="cancel()">{{ cancelText }}</button>
              <button type="button" class="btn rounded-pill px-4 py-2 fw-bold shadow-sm" [ngClass]="btnClass()" (click)="confirm()">{{ confirmText }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .modal-backdrop { background-color: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px); }
    .modal-content { animation: scaleUp 0.2s ease-out; }
    @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .icon-circle { 
      width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    }
    .bg-danger-light { background-color: #fee2e2; color: #dc2626; }
    .bg-warning-light { background-color: #fef3c7; color: #d97706; }
    .bg-info-light { background-color: #e0f2fe; color: #0284c7; }
    .btn-navy { background-color: #1e3a8a; color: white; }
    .btn-navy:hover { background-color: #1e40af; }
  `]
})
export class ConfirmDialogComponent {
    @Input() title: string = 'Confirm Action';
    @Input() message: string = 'Are you sure you want to proceed?';
    @Input() confirmText: string = 'Confirm';
    @Input() cancelText: string = 'Cancel';
    @Input() type: 'danger' | 'warning' | 'info' = 'info';

    show = signal(false);
    private resolveFn: any;

    open(): Promise<boolean> {
        this.show.set(true);
        return new Promise((resolve) => {
            this.resolveFn = resolve;
        });
    }

    confirm() {
        this.show.set(false);
        this.resolveFn(true);
    }

    cancel() {
        this.show.set(false);
        this.resolveFn(false);
    }

    typeClass() {
        return {
            'bg-danger-light': this.type === 'danger',
            'bg-warning-light': this.type === 'warning',
            'bg-info-light': this.type === 'info'
        };
    }

    btnClass() {
        return {
            'btn-danger': this.type === 'danger',
            'btn-warning': this.type === 'warning',
            'btn-navy': this.type === 'info'
        };
    }
}
