import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-item-availability-calendar-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule],
    template: `
    <h2 mat-dialog-title class="fw-bold mb-0 pt-4 px-4 d-flex align-items-center gap-2">
      <svg width="24" height="24" fill="none" class="text-primary" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
      Availability: {{ data.item.name }}
    </h2>
    <mat-dialog-content class="px-4 py-3 custom-scrollbar">
      
      <div class="d-flex justify-content-between align-items-center mb-3">
        <button class="btn btn-sm btn-light d-flex align-items-center justify-content-center px-2 py-1" (click)="prevMonth()" [disabled]="isPrevDisabled()">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <h5 class="fw-bold mb-0 text-dark">{{ currentMonth() | date:'MMMM yyyy' }}</h5>
        <button class="btn btn-sm btn-light d-flex align-items-center justify-content-center px-2 py-1" (click)="nextMonth()">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>
      </div>

      <div class="calendar-container rounded border overflow-hidden">
        <div class="d-grid text-center bg-light border-bottom text-secondary small fw-bold text-uppercase" style="grid-template-columns: repeat(7, 1fr);">
          <div class="p-2 border-end">Sun</div>
          <div class="p-2 border-end">Mon</div>
          <div class="p-2 border-end">Tue</div>
          <div class="p-2 border-end">Wed</div>
          <div class="p-2 border-end">Thu</div>
          <div class="p-2 border-end">Fri</div>
          <div class="p-2">Sat</div>
        </div>
        
        <div class="d-grid" style="grid-template-columns: repeat(7, 1fr);">
          <div *ngFor="let day of calendarCells()" class="p-1 p-sm-2 border-end border-bottom calendar-cell" [class.bg-light]="day.isPadding">
            <div *ngIf="!day.isPadding" class="h-100 d-flex flex-column gap-1">
              <div class="text-end small fw-medium" [class.text-primary]="isToday(day.date)">{{ day.dayNumber }}</div>
              
              <div *ngIf="day.available > 0" class="badge bg-success-subtle text-success w-100 p-1 text-center" style="font-size: 0.7rem; white-space: normal;">
                {{ day.available }} / {{ day.total }} avail
              </div>
              <div *ngIf="day.available === 0" class="badge bg-danger-subtle text-danger w-100 p-1 text-center" style="font-size: 0.7rem; white-space: normal;">
                0 / {{ day.total }} avail
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-3 text-secondary small text-center">
        Total Inventory: <strong>{{ data.item.total_quantity }}</strong> units
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="px-4 pb-4">
      <button mat-button (click)="dialogRef.close()" class="btn btn-light">Close</button>
    </mat-dialog-actions>
  `,
    styles: [`
    .calendar-cell { min-height: 80px; }
    @media (max-width: 576px) {
      .calendar-cell { min-height: 70px; }
    }
  `]
})
export class ItemAvailabilityCalendarDialogComponent implements OnInit {
    public data = inject(MAT_DIALOG_DATA);
    public dialogRef = inject(MatDialogRef<ItemAvailabilityCalendarDialogComponent>);

    currentMonth = signal(new Date());
    calendarCells = signal<any[]>([]);

    ngOnInit() {
        this.generateCalendar();
    }

    isToday(date: Date): boolean {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    }

    isPrevDisabled(): boolean {
        const today = new Date();
        const current = this.currentMonth();
        return current.getFullYear() < today.getFullYear() ||
            (current.getFullYear() === today.getFullYear() && current.getMonth() <= today.getMonth());
    }

    prevMonth() {
        if (this.isPrevDisabled()) return;
        const newMonth = new Date(this.currentMonth());
        newMonth.setMonth(newMonth.getMonth() - 1);
        this.currentMonth.set(newMonth);
        this.generateCalendar();
    }

    nextMonth() {
        const newMonth = new Date(this.currentMonth());
        newMonth.setMonth(newMonth.getMonth() + 1);
        this.currentMonth.set(newMonth);
        this.generateCalendar();
    }

    generateCalendar() {
        const year = this.currentMonth().getFullYear();
        const month = this.currentMonth().getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells = [];

        // Padding for previous month
        for (let i = 0; i < firstDay; i++) {
            cells.push({ isPadding: true });
        }

        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            const targetDate = new Date(year, month, i);
            const avail = this.checkAvailabilityForDate(targetDate);
            cells.push({
                isPadding: false,
                dayNumber: i,
                date: targetDate,
                available: avail,
                total: this.data.item.total_quantity
            });
        }

        // Padding for next month to complete rows
        const totalCells = cells.length;
        const paddingEnd = (7 - (totalCells % 7)) % 7;
        for (let i = 0; i < paddingEnd; i++) {
            cells.push({ isPadding: true });
        }

        this.calendarCells.set(cells);
    }

    checkAvailabilityForDate(targetDate: Date): number {
        const item = this.data.item;
        const bookings = this.data.bookings || [];
        const itemId = item._id || item.id;

        targetDate.setHours(0, 0, 0, 0);

        const overlappingBookings = bookings.filter((b: any) => {
            if (!['active', 'pending', 'confirmed'].includes(b.status)) return false;

            const bStart = new Date(b.start_date as string);
            const bEnd = new Date(b.end_date as string);
            bStart.setHours(0, 0, 0, 0);
            bEnd.setHours(23, 59, 59, 999);

            return bStart.getTime() <= targetDate.getTime() && bEnd.getTime() >= targetDate.getTime();
        });

        let rentedQuantity = 0;
        overlappingBookings.forEach((b: any) => {
            const bItemWrap = b.items?.find((i: any) => {
                const checkBItem = i.item;
                const bItemId = typeof checkBItem === 'object' ? checkBItem?._id || checkBItem?.id : checkBItem;
                return bItemId === itemId;
            });
            if (bItemWrap) {
                rentedQuantity += (bItemWrap.quantity || 1);
            }
        });

        return Math.max(0, item.total_quantity - rentedQuantity);
    }
}
