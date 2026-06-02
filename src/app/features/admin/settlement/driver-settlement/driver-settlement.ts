import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TripService } from '../../../../services/trip.service';
import { AuthService, User } from '../../../../services/auth.service';
import { VehicleService } from '../../../../services/vehicle.service';
import { Trip, Vehicle } from '../../../../models/rental.models';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toSignal } from '@angular/core/rxjs-interop';
import { SettlementService } from '../../../../services/settlement.service';
import { ExpenseService } from '../../../../services/expense.service';

@Component({
  selector: 'app-driver-settlement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './driver-settlement.html',
  styleUrls: ['./driver-settlement.scss', '../settlement-reports.shared.scss'],
})
export class DriverSettlementComponent implements OnInit {
  private tripService = inject(TripService);
  private authService = inject(AuthService);
  private vehicleService = inject(VehicleService);
  private settlementService = inject(SettlementService);
  private expenseService = inject(ExpenseService);
  private fb = inject(FormBuilder);
 
  activeTab = signal<'ledger' | 'handovers' | 'expenses'>('ledger');
  handovers = signal<any[]>([]);
  settlementLoading = signal(false);
  
  // Expense tab state
  allExpenses = signal<any[]>([]);
  expenseLoading = signal(false);
  selectedExpenseImage = signal<string | null>(null);
  
  // Verify modal state
  selectedHandoverForVerify = signal<any | null>(null);
  adminNotes = signal('');
  processingHandover = signal(false);
 
  setTab(tab: 'ledger' | 'handovers' | 'expenses') {
    this.activeTab.set(tab);
    if (tab === 'handovers') {
      this.loadHandovers();
    } else if (tab === 'expenses') {
      this.loadExpenses();
    }
  }

  loadExpenses() {
    this.expenseLoading.set(true);
    this.expenseService.getAll().subscribe({
      next: (res: any) => {
        const data = res && res.success ? res.data : (Array.isArray(res) ? res : []);
        this.allExpenses.set(data);
        this.expenseLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading expenses:', err);
        this.expenseLoading.set(false);
      }
    });
  }

  openExpenseImage(url: string) {
    this.selectedExpenseImage.set(url);
  }

  closeExpenseImage() {
    this.selectedExpenseImage.set(null);
  }

  updateExpenseStatus(id: string, status: 'approved' | 'rejected') {
    const actionText = status === 'approved' ? 'approve' : 'reject';
    if (!confirm(`Are you sure you want to ${actionText} this expense?`)) return;
    
    this.expenseLoading.set(true);
    this.expenseService.updateStatus(id, status).subscribe({
      next: () => {
        alert(`Expense status updated to ${status} successfully!`);
        this.loadExpenses();
      },
      error: (err: any) => {
        console.error('Error updating expense status:', err);
        alert(err.message || 'Error updating expense status');
        this.expenseLoading.set(false);
      }
    });
  }

  loadHandovers() {
    this.settlementLoading.set(true);
    this.settlementService.getAdminSettlements().subscribe({
      next: (res: any) => {
        const data = res && res.success ? res.data : (Array.isArray(res) ? res : []);
        this.handovers.set(data);
        this.settlementLoading.set(false);
      },
      error: () => this.settlementLoading.set(false)
    });
  }

  openVerifyModal(item: any) {
    this.selectedHandoverForVerify.set(item);
    this.adminNotes.set('');
  }

  closeVerifyModal() {
    this.selectedHandoverForVerify.set(null);
  }

  approveHandover() {
    const handover = this.selectedHandoverForVerify();
    if (!handover) return;

    this.processingHandover.set(true);
    this.settlementService.approveSettlement(handover._id, this.adminNotes()).subscribe({
      next: () => {
        this.processingHandover.set(false);
        this.closeVerifyModal();
        this.loadHandovers();
        this.refreshData(); // Refresh ledger trips
        alert('Settlement handover approved successfully!');
      },
      error: (err: any) => {
        this.processingHandover.set(false);
        alert(err.message || 'Error approving settlement');
      }
    });
  }

  rejectHandover() {
    const handover = this.selectedHandoverForVerify();
    if (!handover) return;

    const notes = this.adminNotes().trim();
    if (!notes) {
      alert('Please specify a rejection reason in the notes field.');
      return;
    }

    this.processingHandover.set(true);
    this.settlementService.rejectSettlement(handover._id, notes).subscribe({
      next: () => {
        this.processingHandover.set(false);
        this.closeVerifyModal();
        this.loadHandovers();
        this.refreshData(); // Refresh ledger trips
        alert('Settlement handover rejected.');
      },
      error: (err: any) => {
        this.processingHandover.set(false);
        alert(err.message || 'Error rejecting settlement');
      }
    });
  }

  drivers = signal<User[]>([]);
  vehicles = signal<Vehicle[]>([]);
  allTrips = signal<Trip[]>([]);
  loading = signal(false);
  today = new Date();
  selectedTripExpenses = signal<any>(null);

  filterForm = this.fb.group({
    driverId: [''],
    vehicleId: [''],
    startDate: [this.getStartOfMonth()],
    endDate: [new Date().toISOString().split('T')[0]]
  });

  formValues = toSignal(this.filterForm.valueChanges, { initialValue: this.filterForm.value });

  getStartOfMonth(): string {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  }

  filteredTrips = computed(() => {
    const filters = this.formValues();
    if (!filters) return [];

    return this.allTrips().filter((trip: any) => {
      const tripDate = new Date(trip.startTime).toISOString().split('T')[0];
      const matchDriver = !filters.driverId || 
        (typeof trip.driverId === 'object' ? trip.driverId._id === filters.driverId : trip.driverId === filters.driverId);
      const matchVehicle = !filters.vehicleId || 
        (typeof trip.vehicleId === 'object' ? trip.vehicleId._id === filters.vehicleId : trip.vehicleId === filters.vehicleId);
      const matchDate = tripDate >= (filters.startDate || '') && tripDate <= (filters.endDate || '');
      return matchDriver && matchVehicle && matchDate && trip.status === 'completed';
    });
  });

  filteredExpenses = computed(() => {
    const filters = this.formValues();
    const expenses = this.allExpenses();
    if (!filters) return expenses;

    return expenses.filter((exp: any) => {
      const expDate = new Date(exp.date).toISOString().split('T')[0];
      const matchDriver = !filters.driverId || 
        (typeof exp.driverId === 'object' ? exp.driverId?._id === filters.driverId : exp.driverId === filters.driverId);
      const matchVehicle = !filters.vehicleId || 
        (typeof exp.vehicleId === 'object' ? exp.vehicleId?._id === filters.vehicleId : exp.vehicleId === filters.vehicleId);
      const matchDate = expDate >= (filters.startDate || '') && expDate <= (filters.endDate || '');
      return matchDriver && matchVehicle && matchDate;
    });
  });

  filteredHandovers = computed(() => {
    const filters = this.formValues();
    const handovers = this.handovers();
    if (!filters) return handovers;

    return handovers.filter((item: any) => {
      const matchDriver = !filters.driverId || 
        (typeof item.driverId === 'object' ? item.driverId?._id === filters.driverId : item.driverId === filters.driverId);
      
      const itemDate = new Date(item.paymentDate || item.createdAt).toISOString().split('T')[0];
      const matchDate = itemDate >= (filters.startDate || '') && itemDate <= (filters.endDate || '');
      
      return matchDriver && matchDate;
    });
  });

  stats = computed(() => {
    const trips = this.filteredTrips();
    const expensesList = this.filteredExpenses();

    const totalCollected = trips.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
    const totalTripExpenses = trips.reduce((sum, t) => sum + this.getTripExpenses(t), 0);
    const totalEarnings = trips.reduce((sum, t) => sum + (t.driverEarnings || 0), 0);
    
    // Remaining trip settlement amount (after driver has submitted handovers), adjusted for linked approved expenses
    const tripNetRemaining = trips.reduce((sum, t) => {
      const originalDue = t.driverSettlementAmount || 0;
      const confirmedPaid = t.driverSettlementPaidAmount || 0;
      const approvedExpenses = t.linkedExpenses
        ? t.linkedExpenses.filter((e: any) => e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0)
        : 0;
      return sum + Math.max(0, originalDue - confirmedPaid - approvedExpenses);
    }, 0);
    
    // Separate approved logged expenses that are standalone (not linked to any trip)
    const approvedLoggedExpenses = expensesList
      .filter((e: any) => e.status === 'approved' && !e.tripId)
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      
    // Final Net Settlement = Remaining Trip Settlement - Approved Standalone Expenses
    const finalNet = tripNetRemaining - approvedLoggedExpenses;
    
    // Total approved logged expenses for display
    const allApprovedExpenses = expensesList
      .filter((e: any) => e.status === 'approved')
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    
    return {
      count: trips.length,
      collected: totalCollected,
      expenses: totalTripExpenses + allApprovedExpenses,
      earnings: totalEarnings,
      tripNet: tripNetRemaining,
      loggedExpenses: approvedLoggedExpenses,
      net: finalNet
    };
  });

  selectedDriverObj = computed(() => {
    const filters = this.formValues();
    return this.drivers().find(d => d._id === filters?.driverId);
  });
  
  selectedVehicleObj = computed(() => {
    const filters = this.formValues();
    return this.vehicles().find(v => v._id === filters?.vehicleId);
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.authService.getDrivers().subscribe(d => this.drivers.set(d));
    this.vehicleService.getVehicles().subscribe(v => this.vehicles.set(v));
    this.loadExpenses(); // Load expenses initially
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

  getTripExpenses(trip: any) {
    return (trip.fuelCharges || 0) + (trip.tollParking || 0) + (trip.driverBata || 0) + (trip.permitAmount || 0) + (trip.otherExpenses || 0);
  }

  getTripApprovedExpenses(trip: any): number {
    if (!trip.linkedExpenses) return 0;
    return trip.linkedExpenses
      .filter((e: any) => e.status === 'approved')
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  }

  getTripRemaining(trip: any): number {
    if (!trip) return 0;
    if (trip.driverPaymentStatus === 'confirmed') return 0;
    const originalDue = trip.driverSettlementAmount || 0;
    const confirmedPaid = trip.driverSettlementPaidAmount || 0;
    const approvedExpenses = this.getTripApprovedExpenses(trip);
    return Math.max(0, originalDue - confirmedPaid - approvedExpenses);
  }

  showExpenses(trip: any) {
    this.selectedTripExpenses.set(trip);
  }

  closeExpenses() {
    this.selectedTripExpenses.set(null);
  }

  mathAbs(n: number | undefined): number {
    return Math.abs(n || 0);
  }

  exportToExcel() {
    const data = this.filteredTrips().map(t => {
      const approvedExpenses = t.linkedExpenses
        ? t.linkedExpenses.filter((e: any) => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0)
        : 0;
      return {
        Date: new Date(t.startTime).toLocaleDateString(),
        Voucher: t._id?.slice(-6),
        Customer: t.customerName,
        'Trip Type': t.tripType,
        'Total Bill': t.totalAmount,
        'Cash Collected': t.paidAmount || 0,
        'Fuel/Toll/Bata': this.getTripExpenses(t),
        'Driver Payment': t.driverEarnings || 0,
        'Original Settlement': t.driverSettlementAmount,
        'Paid Amount': t.driverSettlementPaidAmount || 0,
        'Outstanding Balance': Math.max(0, (t.driverSettlementAmount || 0) - (t.driverSettlementPaidAmount || 0) - approvedExpenses),
        Status: t.driverPaymentStatus
      };
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Driver Settlement');
    XLSX.writeFile(wb, `Driver_Settlement_${this.selectedDriverObj()?.name || 'Report'}.xlsx`);
  }

  async exportToPDF() {
    const element = document.getElementById('printableReport');
    if (!element) return;

    this.loading.set(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
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
      pdf.save(`Driver_Settlement_${this.selectedDriverObj()?.name || 'Report'}.pdf`);
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
