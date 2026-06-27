import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  MonitoringCost,
  MonitoringCostRealization,
  CostBasedMonthlyPlan,
} from '../types/monitoring'
import { uid, nowIso } from '../utils/helpers'
import { useLogStore } from './useLogStore'

// ── Seed Data ────────────────────────────────────────────────────────────────

// PS-024-00 monthly plan — total 51,530,901,364
const MONTHLY_PLAN_PS024: Record<string, CostBasedMonthlyPlan> = {
  '2026-01': { planned: 4_800_000_000, items: [
    { itemBiaya: 'MRC',      satuanKerja: 'OSM', planned: 2_000_000_000 },
    { itemBiaya: 'UPAH',     satuanKerja: 'DMO', planned: 1_500_000_000 },
    { itemBiaya: 'Lisensi',  satuanKerja: 'SCS', planned:   600_000_000 },
    { itemBiaya: 'SPPD',     satuanKerja: 'OSM', planned:   200_000_000 },
    { itemBiaya: 'Sewa',     satuanKerja: 'DMO', planned:   350_000_000 },
    { itemBiaya: 'Material', satuanKerja: 'SCS', planned:   150_000_000 },
  ]},
  '2026-02': { planned: 4_200_000_000, items: [
    { itemBiaya: 'MRC',      satuanKerja: 'OSM', planned: 1_700_000_000 },
    { itemBiaya: 'UPAH',     satuanKerja: 'DMO', planned: 1_300_000_000 },
    { itemBiaya: 'Lisensi',  satuanKerja: 'SCS', planned:   500_000_000 },
    { itemBiaya: 'SPPD',     satuanKerja: 'OSM', planned:   200_000_000 },
    { itemBiaya: 'Sewa',     satuanKerja: 'DMO', planned:   350_000_000 },
    { itemBiaya: 'Material', satuanKerja: 'SCS', planned:   150_000_000 },
  ]},
  '2026-03': { planned: 4_000_000_000, items: [
    { itemBiaya: 'MRC',      satuanKerja: 'OSM', planned: 1_600_000_000 },
    { itemBiaya: 'UPAH',     satuanKerja: 'DMO', planned: 1_200_000_000 },
    { itemBiaya: 'Lisensi',  satuanKerja: 'SCS', planned:   450_000_000 },
    { itemBiaya: 'SPPD',     satuanKerja: 'OSM', planned:   200_000_000 },
    { itemBiaya: 'Sewa',     satuanKerja: 'DMO', planned:   400_000_000 },
    { itemBiaya: 'Material', satuanKerja: 'SCS', planned:   150_000_000 },
  ]},
  '2026-04': { planned: 4_500_000_000, items: [
    { itemBiaya: 'MRC',      satuanKerja: 'OSM', planned: 1_800_000_000 },
    { itemBiaya: 'UPAH',     satuanKerja: 'DMO', planned: 1_350_000_000 },
    { itemBiaya: 'Lisensi',  satuanKerja: 'SCS', planned:   600_000_000 },
    { itemBiaya: 'SPPD',     satuanKerja: 'OSM', planned:   250_000_000 },
    { itemBiaya: 'Sewa',     satuanKerja: 'DMO', planned:   350_000_000 },
    { itemBiaya: 'Material', satuanKerja: 'SCS', planned:   150_000_000 },
  ]},
  '2026-05': { planned: 4_300_000_000, items: [
    { itemBiaya: 'MRC',      satuanKerja: 'OSM', planned: 1_700_000_000 },
    { itemBiaya: 'UPAH',     satuanKerja: 'DMO', planned: 1_250_000_000 },
    { itemBiaya: 'Lisensi',  satuanKerja: 'SCS', planned:   550_000_000 },
    { itemBiaya: 'SPPD',     satuanKerja: 'OSM', planned:   200_000_000 },
    { itemBiaya: 'Sewa',     satuanKerja: 'DMO', planned:   450_000_000 },
    { itemBiaya: 'Material', satuanKerja: 'SCS', planned:   150_000_000 },
  ]},
  '2026-06': { planned: 4_400_000_000, items: [
    { itemBiaya: 'MRC',      satuanKerja: 'OSM', planned: 1_800_000_000 },
    { itemBiaya: 'UPAH',     satuanKerja: 'DMO', planned: 1_300_000_000 },
    { itemBiaya: 'Lisensi',  satuanKerja: 'SCS', planned:   500_000_000 },
    { itemBiaya: 'SPPD',     satuanKerja: 'OSM', planned:   200_000_000 },
    { itemBiaya: 'Sewa',     satuanKerja: 'DMO', planned:   450_000_000 },
    { itemBiaya: 'Material', satuanKerja: 'SCS', planned:   150_000_000 },
  ]},
  '2026-07': { planned: 4_200_000_000, items: [
    { itemBiaya: 'MRC',      satuanKerja: 'OSM', planned: 1_700_000_000 },
    { itemBiaya: 'UPAH',     satuanKerja: 'DMO', planned: 1_250_000_000 },
    { itemBiaya: 'Lisensi',  satuanKerja: 'SCS', planned:   450_000_000 },
    { itemBiaya: 'SPPD',     satuanKerja: 'OSM', planned:   200_000_000 },
    { itemBiaya: 'Sewa',     satuanKerja: 'DMO', planned:   450_000_000 },
    { itemBiaya: 'Material', satuanKerja: 'SCS', planned:   150_000_000 },
  ]},
  '2026-08': { planned: 3_900_000_000, items: [
    { itemBiaya: 'MRC',      satuanKerja: 'OSM', planned: 1_500_000_000 },
    { itemBiaya: 'UPAH',     satuanKerja: 'DMO', planned: 1_200_000_000 },
    { itemBiaya: 'Lisensi',  satuanKerja: 'SCS', planned:   400_000_000 },
    { itemBiaya: 'SPPD',     satuanKerja: 'OSM', planned:   150_000_000 },
    { itemBiaya: 'Sewa',     satuanKerja: 'DMO', planned:   500_000_000 },
    { itemBiaya: 'Material', satuanKerja: 'SCS', planned:   150_000_000 },
  ]},
  '2026-09': { planned: 4_100_000_000, items: [
    { itemBiaya: 'MRC',      satuanKerja: 'OSM', planned: 1_600_000_000 },
    { itemBiaya: 'UPAH',     satuanKerja: 'DMO', planned: 1_250_000_000 },
    { itemBiaya: 'Lisensi',  satuanKerja: 'SCS', planned:   450_000_000 },
    { itemBiaya: 'SPPD',     satuanKerja: 'OSM', planned:   200_000_000 },
    { itemBiaya: 'Sewa',     satuanKerja: 'DMO', planned:   450_000_000 },
    { itemBiaya: 'Material', satuanKerja: 'SCS', planned:   150_000_000 },
  ]},
  '2026-10': { planned: 4_000_000_000, items: [
    { itemBiaya: 'MRC',      satuanKerja: 'OSM', planned: 1_550_000_000 },
    { itemBiaya: 'UPAH',     satuanKerja: 'DMO', planned: 1_200_000_000 },
    { itemBiaya: 'Lisensi',  satuanKerja: 'SCS', planned:   450_000_000 },
    { itemBiaya: 'SPPD',     satuanKerja: 'OSM', planned:   200_000_000 },
    { itemBiaya: 'Sewa',     satuanKerja: 'DMO', planned:   450_000_000 },
    { itemBiaya: 'Material', satuanKerja: 'SCS', planned:   150_000_000 },
  ]},
  '2026-11': { planned: 4_300_000_000, items: [
    { itemBiaya: 'MRC',      satuanKerja: 'OSM', planned: 1_700_000_000 },
    { itemBiaya: 'UPAH',     satuanKerja: 'DMO', planned: 1_300_000_000 },
    { itemBiaya: 'Lisensi',  satuanKerja: 'SCS', planned:   500_000_000 },
    { itemBiaya: 'SPPD',     satuanKerja: 'OSM', planned:   200_000_000 },
    { itemBiaya: 'Sewa',     satuanKerja: 'DMO', planned:   450_000_000 },
    { itemBiaya: 'Material', satuanKerja: 'SCS', planned:   150_000_000 },
  ]},
  '2026-12': { planned: 4_830_901_364, items: [
    { itemBiaya: 'MRC',      satuanKerja: 'OSM', planned: 1_800_000_000 },
    { itemBiaya: 'UPAH',     satuanKerja: 'DMO', planned: 1_400_000_000 },
    { itemBiaya: 'Lisensi',  satuanKerja: 'SCS', planned:   550_000_000 },
    { itemBiaya: 'SPPD',     satuanKerja: 'OSM', planned:   200_000_000 },
    { itemBiaya: 'Sewa',     satuanKerja: 'DMO', planned:   550_000_000 },
    { itemBiaya: 'Material', satuanKerja: 'SCS', planned:   330_901_364 },
  ]},
}

// PS-025-00 monthly plan — total 24,000,000,000
const MONTHLY_PLAN_PS025: Record<string, CostBasedMonthlyPlan> = {
  '2026-01': { planned: 2_200_000_000, items: [
    { itemBiaya: 'Lisensi SIMA',         satuanKerja: 'SCS', planned:   950_000_000 },
    { itemBiaya: 'UPAH Konsultan',       satuanKerja: 'DMO', planned:   800_000_000 },
    { itemBiaya: 'Maintenance Software', satuanKerja: 'SCS', planned:   300_000_000 },
    { itemBiaya: 'SPPD',                 satuanKerja: 'OSM', planned:   150_000_000 },
  ]},
  '2026-02': { planned: 1_900_000_000, items: [
    { itemBiaya: 'Lisensi SIMA',         satuanKerja: 'SCS', planned:   800_000_000 },
    { itemBiaya: 'UPAH Konsultan',       satuanKerja: 'DMO', planned:   700_000_000 },
    { itemBiaya: 'Maintenance Software', satuanKerja: 'SCS', planned:   260_000_000 },
    { itemBiaya: 'SPPD',                 satuanKerja: 'OSM', planned:   140_000_000 },
  ]},
  '2026-03': { planned: 1_800_000_000, items: [
    { itemBiaya: 'Lisensi SIMA',         satuanKerja: 'SCS', planned:   750_000_000 },
    { itemBiaya: 'UPAH Konsultan',       satuanKerja: 'DMO', planned:   700_000_000 },
    { itemBiaya: 'Maintenance Software', satuanKerja: 'SCS', planned:   220_000_000 },
    { itemBiaya: 'SPPD',                 satuanKerja: 'OSM', planned:   130_000_000 },
  ]},
  '2026-04': { planned: 2_100_000_000, items: [
    { itemBiaya: 'Lisensi SIMA',         satuanKerja: 'SCS', planned:   900_000_000 },
    { itemBiaya: 'UPAH Konsultan',       satuanKerja: 'DMO', planned:   800_000_000 },
    { itemBiaya: 'Maintenance Software', satuanKerja: 'SCS', planned:   260_000_000 },
    { itemBiaya: 'SPPD',                 satuanKerja: 'OSM', planned:   140_000_000 },
  ]},
  '2026-05': { planned: 2_000_000_000, items: [
    { itemBiaya: 'Lisensi SIMA',         satuanKerja: 'SCS', planned:   850_000_000 },
    { itemBiaya: 'UPAH Konsultan',       satuanKerja: 'DMO', planned:   750_000_000 },
    { itemBiaya: 'Maintenance Software', satuanKerja: 'SCS', planned:   260_000_000 },
    { itemBiaya: 'SPPD',                 satuanKerja: 'OSM', planned:   140_000_000 },
  ]},
  '2026-06': { planned: 2_100_000_000, items: [
    { itemBiaya: 'Lisensi SIMA',         satuanKerja: 'SCS', planned:   900_000_000 },
    { itemBiaya: 'UPAH Konsultan',       satuanKerja: 'DMO', planned:   800_000_000 },
    { itemBiaya: 'Maintenance Software', satuanKerja: 'SCS', planned:   260_000_000 },
    { itemBiaya: 'SPPD',                 satuanKerja: 'OSM', planned:   140_000_000 },
  ]},
  '2026-07': { planned: 1_900_000_000, items: [
    { itemBiaya: 'Lisensi SIMA',         satuanKerja: 'SCS', planned:   800_000_000 },
    { itemBiaya: 'UPAH Konsultan',       satuanKerja: 'DMO', planned:   700_000_000 },
    { itemBiaya: 'Maintenance Software', satuanKerja: 'SCS', planned:   270_000_000 },
    { itemBiaya: 'SPPD',                 satuanKerja: 'OSM', planned:   130_000_000 },
  ]},
  '2026-08': { planned: 1_700_000_000, items: [
    { itemBiaya: 'Lisensi SIMA',         satuanKerja: 'SCS', planned:   700_000_000 },
    { itemBiaya: 'UPAH Konsultan',       satuanKerja: 'DMO', planned:   650_000_000 },
    { itemBiaya: 'Maintenance Software', satuanKerja: 'SCS', planned:   230_000_000 },
    { itemBiaya: 'SPPD',                 satuanKerja: 'OSM', planned:   120_000_000 },
  ]},
  '2026-09': { planned: 2_000_000_000, items: [
    { itemBiaya: 'Lisensi SIMA',         satuanKerja: 'SCS', planned:   850_000_000 },
    { itemBiaya: 'UPAH Konsultan',       satuanKerja: 'DMO', planned:   750_000_000 },
    { itemBiaya: 'Maintenance Software', satuanKerja: 'SCS', planned:   270_000_000 },
    { itemBiaya: 'SPPD',                 satuanKerja: 'OSM', planned:   130_000_000 },
  ]},
  '2026-10': { planned: 2_100_000_000, items: [
    { itemBiaya: 'Lisensi SIMA',         satuanKerja: 'SCS', planned:   900_000_000 },
    { itemBiaya: 'UPAH Konsultan',       satuanKerja: 'DMO', planned:   800_000_000 },
    { itemBiaya: 'Maintenance Software', satuanKerja: 'SCS', planned:   260_000_000 },
    { itemBiaya: 'SPPD',                 satuanKerja: 'OSM', planned:   140_000_000 },
  ]},
  '2026-11': { planned: 2_200_000_000, items: [
    { itemBiaya: 'Lisensi SIMA',         satuanKerja: 'SCS', planned:   950_000_000 },
    { itemBiaya: 'UPAH Konsultan',       satuanKerja: 'DMO', planned:   850_000_000 },
    { itemBiaya: 'Maintenance Software', satuanKerja: 'SCS', planned:   260_000_000 },
    { itemBiaya: 'SPPD',                 satuanKerja: 'OSM', planned:   140_000_000 },
  ]},
  '2026-12': { planned: 2_000_000_000, items: [
    { itemBiaya: 'Lisensi SIMA',         satuanKerja: 'SCS', planned:   850_000_000 },
    { itemBiaya: 'UPAH Konsultan',       satuanKerja: 'DMO', planned:   750_000_000 },
    { itemBiaya: 'Maintenance Software', satuanKerja: 'SCS', planned:   270_000_000 },
    { itemBiaya: 'SPPD',                 satuanKerja: 'OSM', planned:   130_000_000 },
  ]},
}

// PS-026-00 monthly plan — total 2,000,000,000
const MONTHLY_PLAN_PS026: Record<string, CostBasedMonthlyPlan> = {
  '2026-01': { planned: 180_000_000, items: [
    { itemBiaya: 'Spare Part',    satuanKerja: 'OSM', planned: 80_000_000 },
    { itemBiaya: 'UPAH Teknisi', satuanKerja: 'DMO', planned: 60_000_000 },
    { itemBiaya: 'Material',      satuanKerja: 'OSM', planned: 25_000_000 },
    { itemBiaya: 'SPPD',         satuanKerja: 'OSM', planned: 15_000_000 },
  ]},
  '2026-02': { planned: 165_000_000, items: [
    { itemBiaya: 'Spare Part',    satuanKerja: 'OSM', planned: 73_000_000 },
    { itemBiaya: 'UPAH Teknisi', satuanKerja: 'DMO', planned: 55_000_000 },
    { itemBiaya: 'Material',      satuanKerja: 'OSM', planned: 22_000_000 },
    { itemBiaya: 'SPPD',         satuanKerja: 'OSM', planned: 15_000_000 },
  ]},
  '2026-03': { planned: 160_000_000, items: [
    { itemBiaya: 'Spare Part',    satuanKerja: 'OSM', planned: 70_000_000 },
    { itemBiaya: 'UPAH Teknisi', satuanKerja: 'DMO', planned: 55_000_000 },
    { itemBiaya: 'Material',      satuanKerja: 'OSM', planned: 22_000_000 },
    { itemBiaya: 'SPPD',         satuanKerja: 'OSM', planned: 13_000_000 },
  ]},
  '2026-04': { planned: 175_000_000, items: [
    { itemBiaya: 'Spare Part',    satuanKerja: 'OSM', planned: 78_000_000 },
    { itemBiaya: 'UPAH Teknisi', satuanKerja: 'DMO', planned: 58_000_000 },
    { itemBiaya: 'Material',      satuanKerja: 'OSM', planned: 24_000_000 },
    { itemBiaya: 'SPPD',         satuanKerja: 'OSM', planned: 15_000_000 },
  ]},
  '2026-05': { planned: 170_000_000, items: [
    { itemBiaya: 'Spare Part',    satuanKerja: 'OSM', planned: 75_000_000 },
    { itemBiaya: 'UPAH Teknisi', satuanKerja: 'DMO', planned: 57_000_000 },
    { itemBiaya: 'Material',      satuanKerja: 'OSM', planned: 23_000_000 },
    { itemBiaya: 'SPPD',         satuanKerja: 'OSM', planned: 15_000_000 },
  ]},
  '2026-06': { planned: 175_000_000, items: [
    { itemBiaya: 'Spare Part',    satuanKerja: 'OSM', planned: 78_000_000 },
    { itemBiaya: 'UPAH Teknisi', satuanKerja: 'DMO', planned: 58_000_000 },
    { itemBiaya: 'Material',      satuanKerja: 'OSM', planned: 24_000_000 },
    { itemBiaya: 'SPPD',         satuanKerja: 'OSM', planned: 15_000_000 },
  ]},
  '2026-07': { planned: 165_000_000, items: [
    { itemBiaya: 'Spare Part',    satuanKerja: 'OSM', planned: 73_000_000 },
    { itemBiaya: 'UPAH Teknisi', satuanKerja: 'DMO', planned: 55_000_000 },
    { itemBiaya: 'Material',      satuanKerja: 'OSM', planned: 22_000_000 },
    { itemBiaya: 'SPPD',         satuanKerja: 'OSM', planned: 15_000_000 },
  ]},
  '2026-08': { planned: 155_000_000, items: [
    { itemBiaya: 'Spare Part',    satuanKerja: 'OSM', planned: 68_000_000 },
    { itemBiaya: 'UPAH Teknisi', satuanKerja: 'DMO', planned: 52_000_000 },
    { itemBiaya: 'Material',      satuanKerja: 'OSM', planned: 22_000_000 },
    { itemBiaya: 'SPPD',         satuanKerja: 'OSM', planned: 13_000_000 },
  ]},
  '2026-09': { planned: 165_000_000, items: [
    { itemBiaya: 'Spare Part',    satuanKerja: 'OSM', planned: 73_000_000 },
    { itemBiaya: 'UPAH Teknisi', satuanKerja: 'DMO', planned: 55_000_000 },
    { itemBiaya: 'Material',      satuanKerja: 'OSM', planned: 22_000_000 },
    { itemBiaya: 'SPPD',         satuanKerja: 'OSM', planned: 15_000_000 },
  ]},
  '2026-10': { planned: 165_000_000, items: [
    { itemBiaya: 'Spare Part',    satuanKerja: 'OSM', planned: 73_000_000 },
    { itemBiaya: 'UPAH Teknisi', satuanKerja: 'DMO', planned: 55_000_000 },
    { itemBiaya: 'Material',      satuanKerja: 'OSM', planned: 22_000_000 },
    { itemBiaya: 'SPPD',         satuanKerja: 'OSM', planned: 15_000_000 },
  ]},
  '2026-11': { planned: 170_000_000, items: [
    { itemBiaya: 'Spare Part',    satuanKerja: 'OSM', planned: 75_000_000 },
    { itemBiaya: 'UPAH Teknisi', satuanKerja: 'DMO', planned: 57_000_000 },
    { itemBiaya: 'Material',      satuanKerja: 'OSM', planned: 23_000_000 },
    { itemBiaya: 'SPPD',         satuanKerja: 'OSM', planned: 15_000_000 },
  ]},
  '2026-12': { planned: 155_000_000, items: [
    { itemBiaya: 'Spare Part',    satuanKerja: 'OSM', planned: 68_000_000 },
    { itemBiaya: 'UPAH Teknisi', satuanKerja: 'DMO', planned: 52_000_000 },
    { itemBiaya: 'Material',      satuanKerja: 'OSM', planned: 22_000_000 },
    { itemBiaya: 'SPPD',         satuanKerja: 'OSM', planned: 13_000_000 },
  ]},
}

// PS-027-00 monthly plan — total 19,000,000,000
const MONTHLY_PLAN_PS027: Record<string, CostBasedMonthlyPlan> = {
  '2026-01': { planned: 1_650_000_000, items: [
    { itemBiaya: 'Pengadaan Perangkat Jaringan', satuanKerja: 'SCS', planned:   780_000_000 },
    { itemBiaya: 'UPAH Network Engineer',        satuanKerja: 'DMO', planned:   600_000_000 },
    { itemBiaya: 'Lisensi Keamanan Siber',       satuanKerja: 'SCS', planned:   200_000_000 },
    { itemBiaya: 'Maintenance Jaringan',         satuanKerja: 'OSM', planned:    50_000_000 },
    { itemBiaya: 'SPPD',                         satuanKerja: 'OSM', planned:    20_000_000 },
  ]},
  '2026-02': { planned: 1_500_000_000, items: [
    { itemBiaya: 'Pengadaan Perangkat Jaringan', satuanKerja: 'SCS', planned:   700_000_000 },
    { itemBiaya: 'UPAH Network Engineer',        satuanKerja: 'DMO', planned:   555_000_000 },
    { itemBiaya: 'Lisensi Keamanan Siber',       satuanKerja: 'SCS', planned:   175_000_000 },
    { itemBiaya: 'Maintenance Jaringan',         satuanKerja: 'OSM', planned:    50_000_000 },
    { itemBiaya: 'SPPD',                         satuanKerja: 'OSM', planned:    20_000_000 },
  ]},
  '2026-03': { planned: 1_580_000_000, items: [
    { itemBiaya: 'Pengadaan Perangkat Jaringan', satuanKerja: 'SCS', planned:   740_000_000 },
    { itemBiaya: 'UPAH Network Engineer',        satuanKerja: 'DMO', planned:   580_000_000 },
    { itemBiaya: 'Lisensi Keamanan Siber',       satuanKerja: 'SCS', planned:   190_000_000 },
    { itemBiaya: 'Maintenance Jaringan',         satuanKerja: 'OSM', planned:    50_000_000 },
    { itemBiaya: 'SPPD',                         satuanKerja: 'OSM', planned:    20_000_000 },
  ]},
  '2026-04': { planned: 1_520_000_000, items: [
    { itemBiaya: 'Pengadaan Perangkat Jaringan', satuanKerja: 'SCS', planned:   710_000_000 },
    { itemBiaya: 'UPAH Network Engineer',        satuanKerja: 'DMO', planned:   560_000_000 },
    { itemBiaya: 'Lisensi Keamanan Siber',       satuanKerja: 'SCS', planned:   180_000_000 },
    { itemBiaya: 'Maintenance Jaringan',         satuanKerja: 'OSM', planned:    50_000_000 },
    { itemBiaya: 'SPPD',                         satuanKerja: 'OSM', planned:    20_000_000 },
  ]},
  '2026-05': { planned: 1_600_000_000, items: [
    { itemBiaya: 'Pengadaan Perangkat Jaringan', satuanKerja: 'SCS', planned:   750_000_000 },
    { itemBiaya: 'UPAH Network Engineer',        satuanKerja: 'DMO', planned:   590_000_000 },
    { itemBiaya: 'Lisensi Keamanan Siber',       satuanKerja: 'SCS', planned:   190_000_000 },
    { itemBiaya: 'Maintenance Jaringan',         satuanKerja: 'OSM', planned:    50_000_000 },
    { itemBiaya: 'SPPD',                         satuanKerja: 'OSM', planned:    20_000_000 },
  ]},
  '2026-06': { planned: 1_620_000_000, items: [
    { itemBiaya: 'Pengadaan Perangkat Jaringan', satuanKerja: 'SCS', planned:   760_000_000 },
    { itemBiaya: 'UPAH Network Engineer',        satuanKerja: 'DMO', planned:   600_000_000 },
    { itemBiaya: 'Lisensi Keamanan Siber',       satuanKerja: 'SCS', planned:   190_000_000 },
    { itemBiaya: 'Maintenance Jaringan',         satuanKerja: 'OSM', planned:    50_000_000 },
    { itemBiaya: 'SPPD',                         satuanKerja: 'OSM', planned:    20_000_000 },
  ]},
  '2026-07': { planned: 1_550_000_000, items: [
    { itemBiaya: 'Pengadaan Perangkat Jaringan', satuanKerja: 'SCS', planned:   720_000_000 },
    { itemBiaya: 'UPAH Network Engineer',        satuanKerja: 'DMO', planned:   580_000_000 },
    { itemBiaya: 'Lisensi Keamanan Siber',       satuanKerja: 'SCS', planned:   180_000_000 },
    { itemBiaya: 'Maintenance Jaringan',         satuanKerja: 'OSM', planned:    50_000_000 },
    { itemBiaya: 'SPPD',                         satuanKerja: 'OSM', planned:    20_000_000 },
  ]},
  '2026-08': { planned: 1_480_000_000, items: [
    { itemBiaya: 'Pengadaan Perangkat Jaringan', satuanKerja: 'SCS', planned:   690_000_000 },
    { itemBiaya: 'UPAH Network Engineer',        satuanKerja: 'DMO', planned:   550_000_000 },
    { itemBiaya: 'Lisensi Keamanan Siber',       satuanKerja: 'SCS', planned:   170_000_000 },
    { itemBiaya: 'Maintenance Jaringan',         satuanKerja: 'OSM', planned:    50_000_000 },
    { itemBiaya: 'SPPD',                         satuanKerja: 'OSM', planned:    20_000_000 },
  ]},
  '2026-09': { planned: 1_530_000_000, items: [
    { itemBiaya: 'Pengadaan Perangkat Jaringan', satuanKerja: 'SCS', planned:   710_000_000 },
    { itemBiaya: 'UPAH Network Engineer',        satuanKerja: 'DMO', planned:   570_000_000 },
    { itemBiaya: 'Lisensi Keamanan Siber',       satuanKerja: 'SCS', planned:   180_000_000 },
    { itemBiaya: 'Maintenance Jaringan',         satuanKerja: 'OSM', planned:    50_000_000 },
    { itemBiaya: 'SPPD',                         satuanKerja: 'OSM', planned:    20_000_000 },
  ]},
  '2026-10': { planned: 1_580_000_000, items: [
    { itemBiaya: 'Pengadaan Perangkat Jaringan', satuanKerja: 'SCS', planned:   730_000_000 },
    { itemBiaya: 'UPAH Network Engineer',        satuanKerja: 'DMO', planned:   590_000_000 },
    { itemBiaya: 'Lisensi Keamanan Siber',       satuanKerja: 'SCS', planned:   190_000_000 },
    { itemBiaya: 'Maintenance Jaringan',         satuanKerja: 'OSM', planned:    50_000_000 },
    { itemBiaya: 'SPPD',                         satuanKerja: 'OSM', planned:    20_000_000 },
  ]},
  '2026-11': { planned: 1_620_000_000, items: [
    { itemBiaya: 'Pengadaan Perangkat Jaringan', satuanKerja: 'SCS', planned:   750_000_000 },
    { itemBiaya: 'UPAH Network Engineer',        satuanKerja: 'DMO', planned:   610_000_000 },
    { itemBiaya: 'Lisensi Keamanan Siber',       satuanKerja: 'SCS', planned:   190_000_000 },
    { itemBiaya: 'Maintenance Jaringan',         satuanKerja: 'OSM', planned:    50_000_000 },
    { itemBiaya: 'SPPD',                         satuanKerja: 'OSM', planned:    20_000_000 },
  ]},
  '2026-12': { planned: 1_770_000_000, items: [
    { itemBiaya: 'Pengadaan Perangkat Jaringan', satuanKerja: 'SCS', planned:   820_000_000 },
    { itemBiaya: 'UPAH Network Engineer',        satuanKerja: 'DMO', planned:   650_000_000 },
    { itemBiaya: 'Lisensi Keamanan Siber',       satuanKerja: 'SCS', planned:   220_000_000 },
    { itemBiaya: 'Maintenance Jaringan',         satuanKerja: 'OSM', planned:    60_000_000 },
    { itemBiaya: 'SPPD',                         satuanKerja: 'OSM', planned:    20_000_000 },
  ]},
}

const CB_PS024 = Object.values(MONTHLY_PLAN_PS024).reduce((s, m) => s + m.planned, 0) // 51,530,901,364
const CB_PS025 = Object.values(MONTHLY_PLAN_PS025).reduce((s, m) => s + m.planned, 0) // 24,000,000,000
const CB_PS026 = Object.values(MONTHLY_PLAN_PS026).reduce((s, m) => s + m.planned, 0) // 2,000,000,000
const CB_PS027 = Object.values(MONTHLY_PLAN_PS027).reduce((s, m) => s + m.planned, 0) // 19,000,000,000

const SEED_COSTS: MonitoringCost[] = [
  {
    id: 'mc-ps024',
    projectId: 'PS-024-00',
    projectCode: 'PS-024-00',
    year: 2026,
    status: 'active',
    projectClient: 'PT PGN Tbk',
    projectName: 'Pekerjaan Jasa Operasi dan Pemeliharaan Terintegrasi Gas Management System (PJOPTGMS)',
    contractNumber: '009700.PK/HK.02/GLM/2025',
    categoryContract: 'Kontrak Induk',
    dateOfContract: '2025-03-01',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    projectValue: 59_000_000_000,
    costBased: CB_PS024,
    actualCost: 24_770_000_000,
    amandemen: '',
    tkdn: 59.18,
    description: 'Pekerjaan jasa operasi dan pemeliharaan terintegrasi Gas Management System area distribusi gas Kalimantan.',
    costBasedMonthly: MONTHLY_PLAN_PS024,
    createdAt: '2025-12-01T07:00:00.000Z',
    updatedAt: '2025-12-01T07:00:00.000Z',
    createdByUserId: 'u-admin',
    createdByName: 'Admin PGN',
  },
  {
    id: 'mc-ps025',
    projectId: 'PS-025-00',
    projectCode: 'PS-025-00',
    year: 2026,
    status: 'active',
    projectClient: 'PT PGN Tbk',
    projectName: 'Jasa Teknikal Asistensi dan Konsultansi Sistem Informasi Manajemen Aset (SIMA)',
    contractNumber: '009800.PK/HK.02/GLM/2025',
    categoryContract: 'Kontrak Tunggal',
    dateOfContract: '2025-04-15',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    projectValue: 26_977_500_000,
    costBased: CB_PS025,
    actualCost: 9_390_000_000,
    amandemen: '',
    tkdn: 95.47,
    description: 'Jasa teknikal asistensi dan konsultansi pengembangan Sistem Informasi Manajemen Aset PGN.',
    costBasedMonthly: MONTHLY_PLAN_PS025,
    createdAt: '2025-12-01T07:00:00.000Z',
    updatedAt: '2025-12-01T07:00:00.000Z',
    createdByUserId: 'u-admin',
    createdByName: 'Admin PGN',
  },
  {
    id: 'mc-ps026',
    projectId: 'PS-026-00',
    projectCode: 'PS-026-00',
    year: 2026,
    status: 'active',
    projectClient: 'PT PGN Tbk',
    projectName: 'Pekerjaan Penyediaan Layanan Managed Service End User Support (EUS)',
    contractNumber: '009900.PK/HK.02/GLM/2025',
    categoryContract: 'Kontrak Tunggal',
    dateOfContract: '2025-06-01',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    projectValue: 2_419_200_000,
    costBased: CB_PS026,
    actualCost: 794_000_000,
    amandemen: '',
    tkdn: 0,
    description: 'Penyediaan layanan managed service end user support untuk perangkat IT kantor PGN.',
    costBasedMonthly: MONTHLY_PLAN_PS026,
    createdAt: '2025-12-01T07:00:00.000Z',
    updatedAt: '2025-12-01T07:00:00.000Z',
    createdByUserId: 'u-admin',
    createdByName: 'Admin PGN',
  },
  {
    id: 'mc-ps027',
    projectId: 'PS-027-00',
    projectCode: 'PS-027-00',
    year: 2026,
    status: 'active',
    projectClient: 'PT PGN Tbk',
    projectName: 'Jasa Pengelolaan Infrastruktur Jaringan dan Keamanan IT PGN Group',
    contractNumber: '010000.PK/HK.02/GLM/2025',
    categoryContract: 'Kontrak Tunggal',
    dateOfContract: '2025-08-15',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    projectValue: 21_500_000_000,
    costBased: CB_PS027,
    actualCost: 8_358_000_000,
    amandemen: '',
    tkdn: 82.35,
    description: 'Jasa pengelolaan infrastruktur jaringan komputer, keamanan siber, dan monitoring sistem IT untuk operasional PGN Group.',
    costBasedMonthly: MONTHLY_PLAN_PS027,
    createdAt: '2025-12-01T07:00:00.000Z',
    updatedAt: '2025-12-01T07:00:00.000Z',
    createdByUserId: 'u-admin',
    createdByName: 'Admin PGN',
  },
]

function real(
  id: string, kode: string, projId: string,
  item: string, sk: string, pic: string,
  amount: number, status: MonitoringCostRealization['status'],
  vendor: string, period: string, tgl: string,
): MonitoringCostRealization {
  return {
    id, kodeProject: kode, projectId: projId,
    itemBiaya: item, satuanKerja: sk, pic,
    realisasiBiaya: amount, status, vendor, period,
    tanggalRealisasi: tgl,
    createdAt: `${tgl}T07:00:00Z`,
    updatedAt: `${tgl}T07:00:00Z`,
  }
}

const SEED_REALIZATIONS: MonitoringCostRealization[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // PS-024-00  PJOPTGMS  PIC: Nyaklia
  // ══════════════════════════════════════════════════════════════════════════

  // Jan 2026 — On Budget (actual 4.2B / plan 4.8B = 87.5%)
  real('r24j01','PS-024-00','mc-ps024','MRC',      'OSM','Nyaklia', 1_700_000_000,'PAID',             'PT CSM Corporatama',     '2026-01','2026-01-10'),
  real('r24j02','PS-024-00','mc-ps024','UPAH',     'DMO','Nyaklia', 1_300_000_000,'PAID',             'Internal',               '2026-01','2026-01-31'),
  real('r24j03','PS-024-00','mc-ps024','Lisensi',  'SCS','Nyaklia',   480_000_000,'PAID',             'CV Teknologi Mandiri',   '2026-01','2026-01-05'),
  real('r24j04','PS-024-00','mc-ps024','Sewa',     'DMO','Nyaklia',   720_000_000,'PAID',             'PT Mitra IT Nusantara',  '2026-01','2026-01-15'),

  // Feb 2026 — Warning (actual 3.99B / plan 4.2B = 95%)
  real('r24f01','PS-024-00','mc-ps024','MRC',      'OSM','Nyaklia', 1_400_000_000,'PAID',             'PT CSM Corporatama',     '2026-02','2026-02-12'),
  real('r24f02','PS-024-00','mc-ps024','UPAH',     'DMO','Nyaklia', 1_150_000_000,'PAID',             'Internal',               '2026-02','2026-02-28'),
  real('r24f03','PS-024-00','mc-ps024','Lisensi',  'SCS','Nyaklia',   390_000_000,'PAID',             'CV Teknologi Mandiri',   '2026-02','2026-02-05'),
  real('r24f04','PS-024-00','mc-ps024','SPPD',     'OSM','Nyaklia',   200_000_000,'POPAY',            'Internal',               '2026-02','2026-02-22'),
  real('r24f05','PS-024-00','mc-ps024','Sewa',     'DMO','Nyaklia',   700_000_000,'POPAY',            'PT Mitra IT Nusantara',  '2026-02','2026-02-20'),
  real('r24f06','PS-024-00','mc-ps024','Material', 'SCS','Nyaklia',   150_000_000,'PAID',             'PT Indo Service Pratama','2026-02','2026-02-18'),

  // Mar 2026 — Over Budget (actual 4.4B / plan 4.0B = 110%) — unplanned SPPD lapangan
  real('r24m01','PS-024-00','mc-ps024','MRC',      'OSM','Nyaklia', 1_600_000_000,'PAID',             'PT CSM Corporatama',     '2026-03','2026-03-10'),
  real('r24m02','PS-024-00','mc-ps024','UPAH',     'DMO','Nyaklia', 1_200_000_000,'PAID',             'Internal',               '2026-03','2026-03-31'),
  real('r24m03','PS-024-00','mc-ps024','Lisensi',  'SCS','Nyaklia',   350_000_000,'PAID',             'CV Teknologi Mandiri',   '2026-03','2026-03-05'),
  real('r24m04','PS-024-00','mc-ps024','SPPD',     'OSM','Nyaklia',   300_000_000,'PAID',             'Internal',               '2026-03','2026-03-15'),
  real('r24m05','PS-024-00','mc-ps024','Sewa',     'DMO','Nyaklia',   700_000_000,'POPAY',            'PT Mitra IT Nusantara',  '2026-03','2026-03-18'),
  real('r24m06','PS-024-00','mc-ps024','Material', 'SCS','Nyaklia',   250_000_000,'PAID',             'PT Indo Service Pratama','2026-03','2026-03-25'),

  // Apr 2026 — Warning (actual 4.3B / plan 4.5B = 95.6%) — MRC & Sewa menunggu approval
  real('r24a01','PS-024-00','mc-ps024','UPAH',     'DMO','Nyaklia', 1_200_000_000,'PAID',             'Internal',               '2026-04','2026-04-30'),
  real('r24a02','PS-024-00','mc-ps024','Lisensi',  'SCS','Nyaklia',   500_000_000,'READY_TO_RELEASE', 'CV Teknologi Mandiri',   '2026-04','2026-04-10'),
  real('r24a03','PS-024-00','mc-ps024','Material', 'SCS','Nyaklia',   400_000_000,'POPAY',            'PT Indo Service Pratama','2026-04','2026-04-20'),
  real('r24a04','PS-024-00','mc-ps024','MRC',      'OSM','Nyaklia', 1_500_000_000,'READY_TO_RELEASE', 'PT CSM Corporatama',     '2026-04','2026-04-28'),
  real('r24a05','PS-024-00','mc-ps024','Sewa',     'DMO','Nyaklia',   700_000_000,'READY_TO_RELEASE', 'PT Mitra IT Nusantara',  '2026-04','2026-04-25'),

  // May 2026 — On Budget (actual 3.7B / plan 4.3B = 86%)
  real('r24e01','PS-024-00','mc-ps024','MRC',      'OSM','Nyaklia', 1_300_000_000,'PAID',             'PT CSM Corporatama',     '2026-05','2026-05-12'),
  real('r24e02','PS-024-00','mc-ps024','UPAH',     'DMO','Nyaklia', 1_100_000_000,'PAID',             'Internal',               '2026-05','2026-05-31'),
  real('r24e03','PS-024-00','mc-ps024','Lisensi',  'SCS','Nyaklia',   400_000_000,'PAID',             'CV Teknologi Mandiri',   '2026-05','2026-05-05'),
  real('r24e04','PS-024-00','mc-ps024','Sewa',     'DMO','Nyaklia',   600_000_000,'PAID',             'PT Mitra IT Nusantara',  '2026-05','2026-05-18'),
  real('r24e05','PS-024-00','mc-ps024','Material', 'SCS','Nyaklia',   300_000_000,'PAID',             'PT Indo Service Pratama','2026-05','2026-05-22'),

  // Jun 2026 — Warning, bulan berjalan (actual 4.18B / plan 4.4B = 95%)
  real('r24n01','PS-024-00','mc-ps024','MRC',      'OSM','Nyaklia', 1_500_000_000,'PAID',             'PT CSM Corporatama',     '2026-06','2026-06-10'),
  real('r24n02','PS-024-00','mc-ps024','UPAH',     'DMO','Nyaklia', 1_200_000_000,'PAID',             'Internal',               '2026-06','2026-06-27'),
  real('r24n03','PS-024-00','mc-ps024','Lisensi',  'SCS','Nyaklia',   350_000_000,'POPAY',            'CV Teknologi Mandiri',   '2026-06','2026-06-05'),
  real('r24n04','PS-024-00','mc-ps024','Sewa',     'DMO','Nyaklia',   750_000_000,'POPAY',            'PT Mitra IT Nusantara',  '2026-06','2026-06-15'),
  real('r24n05','PS-024-00','mc-ps024','Material', 'SCS','Nyaklia',   380_000_000,'PAID',             'PT Indo Service Pratama','2026-06','2026-06-20'),

  // ══════════════════════════════════════════════════════════════════════════
  // PS-025-00  SIMA  PIC: Budi Santoso
  // ══════════════════════════════════════════════════════════════════════════

  // Jan 2026 — On Budget (actual 1.9B / plan 2.2B = 86.4%)
  real('r25j01','PS-025-00','mc-ps025','Lisensi SIMA',        'SCS','Budi Santoso',   900_000_000,'PAID',             'PT Persada Solutions',   '2026-01','2026-01-12'),
  real('r25j02','PS-025-00','mc-ps025','UPAH Konsultan',      'DMO','Budi Santoso',   700_000_000,'PAID',             'Internal',               '2026-01','2026-01-31'),
  real('r25j03','PS-025-00','mc-ps025','Maintenance Software','SCS','Budi Santoso',   300_000_000,'PAID',             'PT Persada Solutions',   '2026-01','2026-01-20'),

  // Feb 2026 — Under Budget (actual 0.8B / plan 1.9B = 42.1%) — invoice terlambat
  real('r25f01','PS-025-00','mc-ps025','UPAH Konsultan',      'DMO','Budi Santoso',   500_000_000,'PAID',             'Internal',               '2026-02','2026-02-28'),
  real('r25f02','PS-025-00','mc-ps025','SPPD',                'OSM','Budi Santoso',   300_000_000,'PAID',             'Internal',               '2026-02','2026-02-15'),

  // Mar 2026 — On Budget (actual 1.6B / plan 1.8B = 88.9%)
  real('r25m01','PS-025-00','mc-ps025','Lisensi SIMA',        'SCS','Budi Santoso',   850_000_000,'PAID',             'PT Persada Solutions',   '2026-03','2026-03-10'),
  real('r25m02','PS-025-00','mc-ps025','UPAH Konsultan',      'DMO','Budi Santoso',   550_000_000,'PAID',             'Internal',               '2026-03','2026-03-31'),
  real('r25m03','PS-025-00','mc-ps025','Maintenance Software','SCS','Budi Santoso',   200_000_000,'POPAY',            'PT Persada Solutions',   '2026-03','2026-03-25'),

  // Apr 2026 — On Budget (actual 1.81B / plan 2.1B = 86.2%)
  real('r25a01','PS-025-00','mc-ps025','Lisensi SIMA',        'SCS','Budi Santoso',   850_000_000,'READY_TO_RELEASE', 'PT Persada Solutions',   '2026-04','2026-04-14'),
  real('r25a02','PS-025-00','mc-ps025','UPAH Konsultan',      'DMO','Budi Santoso',   700_000_000,'PAID',             'Internal',               '2026-04','2026-04-30'),
  real('r25a03','PS-025-00','mc-ps025','Maintenance Software','SCS','Budi Santoso',   260_000_000,'POPAY',            'PT Persada Solutions',   '2026-04','2026-04-22'),

  // May 2026 — Under Budget (actual 1.45B / plan 2.0B = 72.5%) — upgrade modul tertunda
  real('r25e01','PS-025-00','mc-ps025','Lisensi SIMA',        'SCS','Budi Santoso',   600_000_000,'POPAY',            'PT Persada Solutions',   '2026-05','2026-05-15'),
  real('r25e02','PS-025-00','mc-ps025','UPAH Konsultan',      'DMO','Budi Santoso',   650_000_000,'PAID',             'Internal',               '2026-05','2026-05-31'),
  real('r25e03','PS-025-00','mc-ps025','Maintenance Software','SCS','Budi Santoso',   200_000_000,'POPAY',            'PT Persada Solutions',   '2026-05','2026-05-28'),

  // Jun 2026 — Warning, bulan berjalan (actual 1.83B / plan 2.1B = 87.1%)
  real('r25n01','PS-025-00','mc-ps025','Lisensi SIMA',        'SCS','Budi Santoso',   900_000_000,'PAID',             'PT Persada Solutions',   '2026-06','2026-06-10'),
  real('r25n02','PS-025-00','mc-ps025','UPAH Konsultan',      'DMO','Budi Santoso',   800_000_000,'POPAY',            'Internal',               '2026-06','2026-06-27'),
  real('r25n03','PS-025-00','mc-ps025','SPPD',                'OSM','Budi Santoso',   130_000_000,'PAID',             'Internal',               '2026-06','2026-06-18'),

  // ══════════════════════════════════════════════════════════════════════════
  // PS-026-00  EUS  PIC: Dimas Pratama
  // ══════════════════════════════════════════════════════════════════════════

  // Jan 2026 — Under Budget (actual 125M / plan 180M = 69.4%) — project baru
  real('r26j01','PS-026-00','mc-ps026','Spare Part',   'OSM','Dimas Pratama',  50_000_000,'PAID', 'PT Indo Service Pratama','2026-01','2026-01-20'),
  real('r26j02','PS-026-00','mc-ps026','UPAH Teknisi', 'DMO','Dimas Pratama',  55_000_000,'PAID', 'Internal',               '2026-01','2026-01-31'),
  real('r26j03','PS-026-00','mc-ps026','Material',     'OSM','Dimas Pratama',  20_000_000,'PAID', 'PT Indo Service Pratama','2026-01','2026-01-25'),

  // Feb 2026 — On Budget (actual 133M / plan 165M = 80.6%)
  real('r26f01','PS-026-00','mc-ps026','Spare Part',   'OSM','Dimas Pratama',  65_000_000,'PAID', 'PT Indo Service Pratama','2026-02','2026-02-10'),
  real('r26f02','PS-026-00','mc-ps026','UPAH Teknisi', 'DMO','Dimas Pratama',  50_000_000,'PAID', 'Internal',               '2026-02','2026-02-28'),
  real('r26f03','PS-026-00','mc-ps026','Material',     'OSM','Dimas Pratama',  18_000_000,'PAID', 'PT Indo Service Pratama','2026-02','2026-02-20'),

  // Mar 2026 — Warning (actual 146M / plan 160M = 91.3%) — penggantian printer batch
  real('r26m01','PS-026-00','mc-ps026','Spare Part',   'OSM','Dimas Pratama',  62_000_000,'PAID', 'PT Indo Service Pratama','2026-03','2026-03-08'),
  real('r26m02','PS-026-00','mc-ps026','UPAH Teknisi', 'DMO','Dimas Pratama',  52_000_000,'PAID', 'Internal',               '2026-03','2026-03-31'),
  real('r26m03','PS-026-00','mc-ps026','Material',     'OSM','Dimas Pratama',  20_000_000,'PAID', 'PT Indo Service Pratama','2026-03','2026-03-15'),
  real('r26m04','PS-026-00','mc-ps026','SPPD',         'OSM','Dimas Pratama',  12_000_000,'POPAY','Internal',               '2026-03','2026-03-22'),

  // Apr 2026 — On Budget (actual 150M / plan 175M = 85.7%)
  real('r26a01','PS-026-00','mc-ps026','Spare Part',   'OSM','Dimas Pratama',  72_000_000,'PAID', 'PT Indo Service Pratama','2026-04','2026-04-12'),
  real('r26a02','PS-026-00','mc-ps026','UPAH Teknisi', 'DMO','Dimas Pratama',  55_000_000,'PAID', 'Internal',               '2026-04','2026-04-30'),
  real('r26a03','PS-026-00','mc-ps026','Material',     'OSM','Dimas Pratama',  23_000_000,'POPAY','PT Indo Service Pratama','2026-04','2026-04-25'),

  // May 2026 — On Budget (actual 143M / plan 170M = 84.1%)
  real('r26e01','PS-026-00','mc-ps026','Spare Part',   'OSM','Dimas Pratama',  68_000_000,'PAID', 'PT Indo Service Pratama','2026-05','2026-05-09'),
  real('r26e02','PS-026-00','mc-ps026','UPAH Teknisi', 'DMO','Dimas Pratama',  53_000_000,'PAID', 'Internal',               '2026-05','2026-05-31'),
  real('r26e03','PS-026-00','mc-ps026','Material',     'OSM','Dimas Pratama',  22_000_000,'POPAY','PT Indo Service Pratama','2026-05','2026-05-27'),

  // Jun 2026 — bulan berjalan (actual 97M / plan 175M = 55.4%)
  real('r26n01','PS-026-00','mc-ps026','Spare Part',   'OSM','Dimas Pratama',  55_000_000,'POPAY','PT Indo Service Pratama','2026-06','2026-06-10'),
  real('r26n02','PS-026-00','mc-ps026','UPAH Teknisi', 'DMO','Dimas Pratama',  42_000_000,'POPAY','Internal',               '2026-06','2026-06-27'),

  // ══════════════════════════════════════════════════════════════════════════
  // PS-027-00  Infrastruktur Jaringan & Keamanan IT  PIC: Fajar Rahman
  // ══════════════════════════════════════════════════════════════════════════

  // Jan 2026 — Warning (actual 1.492B / plan 1.65B = 90.4%)
  real('r27j01','PS-027-00','mc-ps027','Pengadaan Perangkat Jaringan','SCS','Fajar Rahman',   720_000_000,'PAID',             'PT Infranet Jaya',       '2026-01','2026-01-08'),
  real('r27j02','PS-027-00','mc-ps027','UPAH Network Engineer',        'DMO','Fajar Rahman',   580_000_000,'PAID',             'Internal',               '2026-01','2026-01-31'),
  real('r27j03','PS-027-00','mc-ps027','Lisensi Keamanan Siber',       'SCS','Fajar Rahman',   192_000_000,'PAID',             'PT CyberSec Solutions',  '2026-01','2026-01-06'),

  // Feb 2026 — On Budget (actual 1.283B / plan 1.5B = 85.5%)
  real('r27f01','PS-027-00','mc-ps027','Pengadaan Perangkat Jaringan','SCS','Fajar Rahman',   690_000_000,'PAID',             'PT Infranet Jaya',       '2026-02','2026-02-11'),
  real('r27f02','PS-027-00','mc-ps027','UPAH Network Engineer',        'DMO','Fajar Rahman',   545_000_000,'PAID',             'Internal',               '2026-02','2026-02-28'),
  real('r27f03','PS-027-00','mc-ps027','Maintenance Jaringan',         'OSM','Fajar Rahman',    48_000_000,'PAID',             'PT Infranet Jaya',       '2026-02','2026-02-18'),

  // Mar 2026 — Warning (actual 1.503B / plan 1.58B = 95.1%) — patch keamanan mendesak
  real('r27m01','PS-027-00','mc-ps027','Pengadaan Perangkat Jaringan','SCS','Fajar Rahman',   728_000_000,'PAID',             'PT Infranet Jaya',       '2026-03','2026-03-07'),
  real('r27m02','PS-027-00','mc-ps027','UPAH Network Engineer',        'DMO','Fajar Rahman',   572_000_000,'PAID',             'Internal',               '2026-03','2026-03-31'),
  real('r27m03','PS-027-00','mc-ps027','Lisensi Keamanan Siber',       'SCS','Fajar Rahman',   184_000_000,'PAID',             'PT CyberSec Solutions',  '2026-03','2026-03-04'),
  real('r27m04','PS-027-00','mc-ps027','SPPD',                         'OSM','Fajar Rahman',    19_000_000,'POPAY',            'Internal',               '2026-03','2026-03-20'),

  // Apr 2026 — On Budget (actual 1.343B / plan 1.52B = 88.4%)
  real('r27a01','PS-027-00','mc-ps027','Pengadaan Perangkat Jaringan','SCS','Fajar Rahman',   715_000_000,'PAID',             'PT Infranet Jaya',       '2026-04','2026-04-09'),
  real('r27a02','PS-027-00','mc-ps027','UPAH Network Engineer',        'DMO','Fajar Rahman',   560_000_000,'PAID',             'Internal',               '2026-04','2026-04-30'),
  real('r27a03','PS-027-00','mc-ps027','Maintenance Jaringan',         'OSM','Fajar Rahman',    50_000_000,'READY_TO_RELEASE', 'PT Infranet Jaya',       '2026-04','2026-04-22'),
  real('r27a04','PS-027-00','mc-ps027','SPPD',                         'OSM','Fajar Rahman',    18_000_000,'POPAY',            'Internal',               '2026-04','2026-04-16'),

  // May 2026 — Warning (actual 1.529B / plan 1.6B = 95.6%)
  real('r27e01','PS-027-00','mc-ps027','Pengadaan Perangkat Jaringan','SCS','Fajar Rahman',   755_000_000,'PAID',             'PT Infranet Jaya',       '2026-05','2026-05-08'),
  real('r27e02','PS-027-00','mc-ps027','UPAH Network Engineer',        'DMO','Fajar Rahman',   588_000_000,'PAID',             'Internal',               '2026-05','2026-05-31'),
  real('r27e03','PS-027-00','mc-ps027','Lisensi Keamanan Siber',       'SCS','Fajar Rahman',   186_000_000,'POPAY',            'PT CyberSec Solutions',  '2026-05','2026-05-06'),

  // Jun 2026 — bulan berjalan (actual 1.208B / plan 1.62B = 74.5%)
  real('r27n01','PS-027-00','mc-ps027','Pengadaan Perangkat Jaringan','SCS','Fajar Rahman',   630_000_000,'PAID',             'PT Infranet Jaya',       '2026-06','2026-06-06'),
  real('r27n02','PS-027-00','mc-ps027','UPAH Network Engineer',        'DMO','Fajar Rahman',   530_000_000,'POPAY',            'Internal',               '2026-06','2026-06-27'),
  real('r27n03','PS-027-00','mc-ps027','Maintenance Jaringan',         'OSM','Fajar Rahman',    48_000_000,'POPAY',            'PT Infranet Jaya',       '2026-06','2026-06-15'),
]

// ── Store ─────────────────────────────────────────────────────────────────────

interface MonitoringCostState {
  costs: MonitoringCost[]
  realizations: MonitoringCostRealization[]

  addCost: (data: Omit<MonitoringCost, 'id' | 'createdAt' | 'updatedAt'>) => MonitoringCost
  updateCost: (id: string, patch: Partial<Omit<MonitoringCost, 'id' | 'createdAt'>>) => void
  deleteCost: (id: string) => void
  getCostById: (id: string) => MonitoringCost | undefined

  addRealization: (data: Omit<MonitoringCostRealization, 'id' | 'createdAt' | 'updatedAt'>) => MonitoringCostRealization
  updateRealization: (id: string, patch: Partial<Omit<MonitoringCostRealization, 'id' | 'createdAt'>>) => void
  deleteRealization: (id: string) => void
  getRealizationsByProjectId: (projectId: string) => MonitoringCostRealization[]
}

export const useMonitoringCostStore = create<MonitoringCostState>()(
  persist(
    (set, get) => ({
      costs: SEED_COSTS,
      realizations: SEED_REALIZATIONS,

      addCost: (data) => {
        const now = nowIso()
        const cost: MonitoringCost = { ...data, id: uid('mc'), createdAt: now, updatedAt: now }
        set((s) => ({ costs: [cost, ...s.costs] }))
        useLogStore.getState().addLog({ type: 'monitoring_cost_created', message: `Cost project "${data.projectName}" dibuat`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
        return cost
      },

      updateCost: (id, patch) => {
        set((s) => ({ costs: s.costs.map((c) => c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c) }))
        useLogStore.getState().addLog({ type: 'monitoring_cost_edited', message: `Cost project diperbarui`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },

      deleteCost: (id) => {
        set((s) => ({ costs: s.costs.filter((c) => c.id !== id), realizations: s.realizations.filter((r) => r.projectId !== id) }))
        useLogStore.getState().addLog({ type: 'monitoring_cost_deleted', message: `Cost project dihapus`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },

      getCostById: (id) => get().costs.find((c) => c.id === id),

      addRealization: (data) => {
        const now = nowIso()
        const real: MonitoringCostRealization = { ...data, id: uid('mcr'), createdAt: now, updatedAt: now }
        set((s) => ({ realizations: [real, ...s.realizations] }))
        useLogStore.getState().addLog({ type: 'monitoring_cost_realization_created', message: `Realisasi biaya "${data.itemBiaya}" dibuat`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
        return real
      },

      updateRealization: (id, patch) => {
        set((s) => ({ realizations: s.realizations.map((r) => r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r) }))
        useLogStore.getState().addLog({ type: 'monitoring_cost_realization_edited', message: `Realisasi biaya diperbarui`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },

      deleteRealization: (id) => {
        set((s) => ({ realizations: s.realizations.filter((r) => r.id !== id) }))
        useLogStore.getState().addLog({ type: 'monitoring_cost_realization_deleted', message: `Realisasi biaya dihapus`, taskId: null, taskTitle: null, fromTeamId: null, toTeamId: null })
      },

      getRealizationsByProjectId: (projectId) => get().realizations.filter((r) => r.projectId === projectId),
    }),
    {
      name: 'flowdesk:monitoring-cost',
      version: 4,
      migrate: () => ({ costs: SEED_COSTS, realizations: SEED_REALIZATIONS }),
    },
  ),
)
