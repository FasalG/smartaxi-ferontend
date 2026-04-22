import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TripService } from '../../../../services/trip.service';
import { CustomerService } from '../../../../services/customer.service';
import { Trip, Customer } from '../../../../models/rental.models';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toSignal } from '@angular/core/rxjs-interop';

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
    startDate: [this.getStartOfMonth()],
    endDate: [new Date().toISOString().split('T')[0]]
  });

  formValues = toSignal(this.filterForm.valueChanges, { initialValue: this.filterForm.value as any });

  getStartOfMonth(): string {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  }

  filteredTrips = computed(() => {
    const filters = this.formValues();
    if (!filters) return [];

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
    const filters = this.formValues();
    return this.customers().find(c => c._id === filters?.customerId);
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.customerService.getAll().subscribe(c => this.customers.set(c.filter(x => x.isEligibleForCredit)));
    this.refreshData();
  }

  refreshData() {
    this.loading.set(true);
    this.tripService.getTrips(true).subscribe({
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

  async exportToPDF() {
    const element = document.getElementById('printableReport');
    if (!element) return;

    this.loading.set(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Customer_Statement_${this.selectedCustomerObj()?.name || 'Report'}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
    } finally {
      this.loading.set(false);
    }
  }

  printReport() {
    window.print();
  }
}
