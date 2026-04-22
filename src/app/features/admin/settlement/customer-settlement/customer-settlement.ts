import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TripService } from '../../../../services/trip.service';
import { CustomerService } from '../../../../services/customer.service';
import { Trip, Customer } from '../../../../models/rental.models';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-customer-settlement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customer-settlement.html',
  styleUrls: ['./customer-settlement.scss', '../settlement-reports.shared.scss'],
})
export class CustomerSettlementComponent implements OnInit {
  private tripService = inject(TripService);
  private customerService = inject(CustomerService);
  private fb = inject(FormBuilder);

  customers = signal<Customer[]>([]);
  allTrips = signal<Trip[]>([]);
  loading = signal(false);
  today = new Date();

  filterForm = this.fb.group({
    customerId: [''],
    startDate: [new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]], // Last 30 days
    endDate: [new Date().toISOString().split('T')[0]]
  });

  filteredTrips = computed(() => {
    const filters = this.filterForm.value;
    return this.allTrips().filter((trip: any) => {
      const tripDate = new Date(trip.startTime).toISOString().split('T')[0];
      const cid = typeof trip.customerId === 'object' ? trip.customerId?._id : trip.customerId;
      const matchCustomer = !filters.customerId || cid === filters.customerId;
      const matchDate = tripDate >= (filters.startDate || '') && tripDate <= (filters.endDate || '');
      return matchCustomer && matchDate && trip.tripType === 'Credit';
    });
  });

  stats = computed(() => {
    const trips = this.filteredTrips();
    const totalBilled = trips.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalPaid = trips.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
    const balance = trips.reduce((sum, t) => sum + (t.balanceAmount || 0), 0);
    
    return {
      count: trips.length,
      billed: totalBilled,
      paid: totalPaid,
      balance: balance
    };
  });

  selectedCustomerObj = computed(() => {
    return this.customers().find(c => c._id === this.filterForm.value.customerId);
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.customerService.getAll().subscribe(c => this.customers.set(c.filter(x => x.isEligibleForCredit)));
    this.tripService.getTrips().subscribe({
      next: (t) => {
        this.allTrips.set(t);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  exportToExcel() {
    const data = this.filteredTrips().map(t => ({
      Date: new Date(t.startTime).toLocaleDateString(),
      Voucher: t._id?.slice(-6),
      Vehicle: typeof t.vehicleId === 'object' ? t.vehicleId.licensePlate : 'N/A',
      'Total Bill': t.totalAmount,
      'Amount Paid': t.paidAmount,
      'Outstanding Balance': t.balanceAmount,
      Status: t.paymentStatus
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Settlement');
    XLSX.writeFile(wb, `Customer_Statement_${this.selectedCustomerObj()?.name || 'Report'}.xlsx`);
  }

  printReport() {
    window.print();
  }
}
