import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';

interface Metric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  color: string;
}

interface MonthlyData {
  month: string;
  revenue: number;
  rentals: number;
  utilization: number;
}

interface CategoryData {
  category: string;
  revenue: number;
  rentals: number;
  avgDuration: number;
}

interface UtilizationWeek {
  week: string;
  utilized: number;
  available: number;
}

interface TopItem {
  name: string;
  rentals: number;
  revenue: number;
  utilization: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule],
  template: `
    <div class="container-fluid py-4">
      <div class="mb-4">
        <h2 class="h3 fw-bold text-dark mb-0">Analytics & Reports</h2>
        <p class="text-secondary mb-0">Comprehensive insights into your rental business</p>
      </div>

      <!-- Key Metrics -->
      <div class="row g-4 mb-4">
        <div *ngFor="let metric of metrics" class="col-6 col-md-6 col-lg-3">
          <div class="card shadow-sm border-0 p-3 h-100">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div [class]="'p-3 rounded-3 ' + metric.color + ' text-white shadow-sm'">
                <!-- Icon logic based on title -->
                <svg *ngIf="metric.title === 'Total Revenue'" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3 1.343 3 3-1.343 3-3 3m0-12a9 9 0 110 18 9 9 0 010-18zm0 0V3m0 18v-3" />
                </svg>
                <svg *ngIf="metric.title === 'Active Rentals'" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <svg *ngIf="metric.title === 'Utilization Rate'" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <svg *ngIf="metric.title === 'Avg Rental Value'" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div [class]="metric.isPositive ? 'text-success d-flex align-items-center gap-1 small fw-bold' : 'text-danger d-flex align-items-center gap-1 small fw-bold'">
                <svg *ngIf="metric.isPositive" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <svg *ngIf="!metric.isPositive" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                {{ metric.change }}
              </div>
            </div>
            <h3 class="text-secondary small mb-1">{{ metric.title }}</h3>
            <p class="h3 fw-bold text-dark mb-0">{{ metric.value }}</p>
          </div>
        </div>
      </div>

      <!-- Revenue & Utilization Trend (Placeholder Chart using SVG) -->
      <div class="card shadow-sm border-0 p-4 mb-4">
        <div class="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h3 class="h5 fw-bold text-dark mb-1">Revenue & Utilization Trend</h3>
            <p class="small text-secondary mb-0">Last 7 months performance</p>
          </div>
          <div class="d-flex gap-4">
            <div class="d-flex align-items-center gap-2">
              <span class="d-inline-block bg-primary rounded-circle" style="width: 10px; height: 10px;"></span>
              <span class="small text-secondary">Revenue</span>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="d-inline-block bg-info rounded-circle" style="width: 10px; height: 10px;"></span>
              <span class="small text-secondary">Utilization %</span>
            </div>
          </div>
        </div>
        
        <div class="chart-container" style="height: 350px; position: relative;">
          <!-- SVG Area Chart Placeholder -->
          <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="none">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:rgba(13, 110, 253, 0.3);stop-opacity:1" />
                <stop offset="100%" style="stop-color:rgba(13, 110, 253, 0);stop-opacity:1" />
              </linearGradient>
            </defs>
            <!-- Grid Lines -->
            <line x1="0" y1="50" x2="800" y2="50" stroke="#f1f3f5" stroke-width="1" />
            <line x1="0" y1="100" x2="800" y2="100" stroke="#f1f3f5" stroke-width="1" />
            <line x1="0" y1="150" x2="800" y2="150" stroke="#f1f3f5" stroke-width="1" />
            <line x1="0" y1="200" x2="800" y2="200" stroke="#f1f3f5" stroke-width="1" />
            <line x1="0" y1="250" x2="800" y2="250" stroke="#f1f3f5" stroke-width="1" />
            
            <!-- Area Path (Simulated) -->
            <path d="M0,250 L133,220 L266,235 L399,200 L532,170 L665,145 L800,120 L800,300 L0,300 Z" fill="url(#grad1)" />
            <!-- Revenue Line (Primary) -->
            <path d="M0,250 L133,220 L266,235 L399,200 L532,170 L665,145 L800,120" fill="none" stroke="#0d6efd" stroke-width="3" />
            <!-- Utilization Line (Info) -->
            <path d="M0,180 L133,165 L266,175 L399,150 L532,135 L665,125 L800,110" fill="none" stroke="#0dcaf0" stroke-width="3" stroke-dasharray="5,5" />
          </svg>
          <!-- X-Axis Labels -->
          <div class="d-flex justify-content-between mt-2 px-1 text-secondary smaller fw-medium text-uppercase">
            <span *ngFor="let item of monthlyRevenue">{{ item.month }}</span>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <!-- Category Revenue Bar Chart -->
        <div class="col-12 col-lg-6">
          <div class="card shadow-sm border-0 p-3 h-100">
            <h3 class="h5 fw-bold text-dark mb-4">Revenue by Category</h3>
            <div class="d-flex flex-column gap-4">
              <div *ngFor="let cat of categoryRevenue">
                <div class="d-flex justify-content-between mb-1">
                  <span class="small text-secondary fw-medium">{{ cat.category }}</span>
                  <span class="small fw-bold text-dark">{{ cat.revenue | currency:'INR':'symbol':'1.0-0' }}</span>
                </div>
                <div class="progress" style="height: 12px; background-color: #f1f3f5;">
                  <div class="progress-bar bg-success rounded" role="progressbar" 
                    [style.width.%]="(cat.revenue / 35000) * 100"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Weekly Utilization Bar Chart -->
        <div class="col-12 col-lg-6">
          <div class="card shadow-sm border-0 p-3 h-100">
            <h3 class="h5 fw-bold text-dark mb-4">Equipment Utilization (Monthly)</h3>
            <div class="d-flex align-items-end justify-content-between h-100 pb-2" style="min-height: 200px;">
              <div *ngFor="let week of utilizationData" class="d-flex flex-column align-items-center gap-2" style="width: 20%;">
                <div class="position-relative w-100 d-flex flex-column justify-content-end" style="height: 180px;">
                   <!-- Unavailable (Stack Top) -->
                   <div class="bg-light w-75 mx-auto rounded-top" [style.height.%]="week.available"></div>
                   <!-- Utilized (Stack Bottom) -->
                   <div class="bg-primary w-75 mx-auto rounded-bottom" [style.height.%]="week.utilized"></div>
                </div>
                <span class="smaller text-secondary text-nowrap">{{ week.week }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Performing Items -->
      <div class="card shadow-sm border-0 mb-4 overflow-hidden">
        <div class="card-header bg-white border-0 p-4 pb-2">
          <h3 class="h5 fw-bold text-dark mb-1">Top Performing Items</h3>
          <p class="small text-secondary mb-0">Best performing rental items this month</p>
        </div>
        <div class="table-responsive">
          <table mat-table [dataSource]="dataSource" class="w-100 table-hover align-middle mb-0">
            <ng-container matColumnDef="rank">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0">Rank</th>
              <td mat-cell *matCellDef="let item; let i = index" class="px-4 py-3">
                <div [class]="getRankClass(i)">{{ i + 1 }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0">Item Name</th>
              <td mat-cell *matCellDef="let item" class="px-4 py-3 small fw-bold text-dark">{{ item.name }}</td>
            </ng-container>

            <ng-container matColumnDef="rentals">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0 text-center">Rentals</th>
              <td mat-cell *matCellDef="let item" class="px-4 py-3 small text-center">{{ item.rentals }}</td>
            </ng-container>

            <ng-container matColumnDef="revenue">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0 text-end">Revenue</th>
              <td mat-cell *matCellDef="let item" class="px-4 py-3 small fw-bold text-dark text-end">{{ item.revenue | currency:'INR':'symbol':'1.0-0' }}</td>
            </ng-container>

            <ng-container matColumnDef="utilization">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0 text-center">Utilization</th>
              <td mat-cell *matCellDef="let item" class="px-4 py-3 text-center">
                <span [class]="getUtilBadgeClass(item.utilization)">{{ item.utilization }}%</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="performance">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 border-0" style="min-width: 150px;">Performance</th>
              <td mat-cell *matCellDef="let item" class="px-4 py-3">
                <div class="d-flex align-items-center gap-2">
                  <div class="progress flex-grow-1" style="height: 6px; background-color: #f1f3f5;">
                    <div class="progress-bar bg-success rounded" [style.width.%]="item.utilization"></div>
                  </div>
                  <svg class="text-success" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns" class="table-light text-secondary small text-uppercase fw-medium text-nowrap"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover-bg-light"></tr>
          </table>
          <mat-paginator [pageSizeOptions]="[10, 25, 50]" [pageSize]="10" showFirstLastButtons></mat-paginator>
        </div>
      </div>

      <!-- Additional Stats Cards -->
      <div class="row g-4">
        <div class="col-12 col-md-4">
          <div class="card border-0 p-4 text-white shadow-sm h-100" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
            <h4 class="small fw-medium mb-2 opacity-75">Average Rental Duration</h4>
            <p class="display-6 fw-bold mb-2">4.8 days</p>
            <p class="smaller mb-0 opacity-75">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="me-1">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              +0.3 days from last month
            </p>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="card border-0 p-4 text-white shadow-sm h-100" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <h4 class="small fw-medium mb-2 opacity-75">Revenue per Item</h4>
            <p class="display-6 fw-bold mb-2">₹2,125</p>
            <p class="smaller mb-0 opacity-75">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="me-1">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              +12% from last month
            </p>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="card border-0 p-4 text-white shadow-sm h-100" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
            <h4 class="small fw-medium mb-2 opacity-75">Customer Satisfaction</h4>
            <p class="display-6 fw-bold mb-2">4.7/5.0</p>
            <p class="smaller mb-0 opacity-75">Based on 156 reviews</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .smaller { font-size: 0.7rem; }
    .rank-badge {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
    }
  `]
})
export class AnalyticsComponent implements AfterViewInit {
  displayedColumns: string[] = ['rank', 'name', 'rentals', 'revenue', 'utilization', 'performance'];
  dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.data = this.topItems;
    this.dataSource.paginator = this.paginator;
  }

  monthlyRevenue: MonthlyData[] = [
    { month: "JUL", revenue: 42000, rentals: 85, utilization: 68 },
    { month: "AUG", revenue: 48000, rentals: 92, utilization: 72 },
    { month: "SEP", revenue: 45000, rentals: 88, utilization: 70 },
    { month: "OCT", revenue: 52000, rentals: 105, utilization: 78 },
    { month: "NOV", revenue: 58000, rentals: 118, utilization: 82 },
    { month: "DEC", revenue: 63000, rentals: 127, utilization: 85 },
    { month: "JAN", revenue: 68000, rentals: 135, utilization: 88 },
  ];

  categoryRevenue: CategoryData[] = [
    { category: "Construction Equipment", revenue: 35000, rentals: 45, avgDuration: 5.2 },
    { category: "Party Supplies", revenue: 18000, rentals: 68, avgDuration: 2.1 },
    { category: "Vehicles", revenue: 28000, rentals: 52, avgDuration: 6.8 },
    { category: "Electronics", revenue: 15000, rentals: 38, avgDuration: 3.5 },
  ];

  utilizationData: UtilizationWeek[] = [
    { week: "Week 1", utilized: 75, available: 25 },
    { week: "Week 2", utilized: 82, available: 18 },
    { week: "Week 3", utilized: 88, available: 12 },
    { week: "Week 4", utilized: 85, available: 15 },
  ];

  topItems: TopItem[] = [
    { name: "Excavator CAT 320", rentals: 28, revenue: 12600, utilization: 93 },
    { name: "Toyota Camry 2025", rentals: 42, revenue: 10920, utilization: 84 },
    { name: "Party Tent 20x30", rentals: 38, revenue: 8550, utilization: 76 },
    { name: "Sound System Pro", rentals: 24, revenue: 8400, utilization: 80 },
    { name: "Forklift 5000lb", rentals: 18, revenue: 7560, utilization: 90 },
  ];

  metrics: Metric[] = [
    {
      title: "Total Revenue",
      value: "₹68,000",
      change: "+15.2%",
      isPositive: true,
      color: "bg-success",
    },
    {
      title: "Active Rentals",
      value: "127",
      change: "+8.5%",
      isPositive: true,
      color: "bg-primary",
    },
    {
      title: "Utilization Rate",
      value: "88%",
      change: "+6.1%",
      isPositive: true,
      color: "bg-danger",
    },
    {
      title: "Avg Rental Value",
      value: "₹504",
      change: "+3.2%",
      isPositive: true,
      color: "bg-warning",
    },
  ];

  getRankClass(index: number): string {
    const base = 'rank-badge';
    switch (index) {
      case 0: return `₹{base} bg-warning-subtle text-warning-emphasis border border-warning`;
      case 1: return `₹{base} bg-light text-dark border border-secondary-subtle`;
      case 2: return `₹{base} bg-orange-100 text-orange-700 border border-orange-200`;
      default: return `₹{base} bg-light text-secondary border`;
    }
  }

  getUtilBadgeClass(util: number): string {
    const base = 'badge rounded-pill fw-normal px-2 py-1';
    if (util >= 85) return `₹{base} bg-success-subtle text-success border border-success`;
    if (util >= 70) return `₹{base} bg-primary-subtle text-primary border border-primary`;
    return `₹{base} bg-warning-subtle text-warning-emphasis border border-warning`;
  }
}
