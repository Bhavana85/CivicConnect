'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getBudgetSummary, updateBudgetItem } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  BarChart2, Shield, Banknote, TrendingDown, TrendingUp, Calendar, 
  PieChart, ClipboardList, Edit3, CheckCircle2, AlertTriangle, AlertCircle, 
  Check, X 
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ── Sample budget data (Bengaluru BBMP FY 2024-25) ──────────────────────────
const BUDGET_DATA = [
  { id: 1, department: 'Roads & Infrastructure', allocated: 135, spent: 82.4, category: 'Infrastructure' },
  { id: 2, department: 'Water Supply',           allocated: 50,  spent: 43.4, category: 'Utilities' },
  { id: 3, department: 'Solid Waste',            allocated: 36,  spent: 28.6, category: 'Sanitation' },
  { id: 4, department: 'Street Lighting',        allocated: 15,  spent: 12.0, category: 'Utilities' },
  { id: 5, department: 'Parks & Recreation',     allocated: 17,  spent: 13.0, category: 'Amenities' },
  { id: 6, department: 'Health & Sanitation',    allocated: 21.5, spent: 18.0, category: 'Health' },
];

const DEPT_COLORS = [
  '#1a4fa0', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
];

function fmt(crore: number) {
  if (crore >= 100) return `₹${(crore / 100).toFixed(1)}K Cr`;
  return `₹${crore.toFixed(1)} Cr`;
}

function pct(spent: number, allocated: number) {
  return Math.round((spent / allocated) * 100);
}

export default function BudgetDashboard() {
  const { t } = useTranslation();
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [budgetData, setBudgetData] = useState(BUDGET_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAllocated, setEditAllocated] = useState('');
  const [editSpent, setEditSpent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUserRole(localStorage.getItem('cc_user_role') || '');
    const fetchBudget = async () => {
      try {
        const res = await getBudgetSummary(2024);
        const depts = res.data.departments;
        if (depts && depts.length > 0) {
          setBudgetData(depts.map((d: any, i: number) => ({
            id: i + 1,
            department: d.department,
            allocated: parseFloat(d.total_allocated) / 10000000,
            spent: parseFloat(d.total_spent) / 10000000,
            category: d.department,
          })));
        }
      } catch {
        // Use fallback BUDGET_DATA
      } finally {
        setIsLoading(false);
      }
    };
    fetchBudget();
  }, []);

  const isGov = userRole === 'government';

  const startEdit = (item: typeof BUDGET_DATA[0]) => {
    setEditingId(item.id);
    setEditAllocated(item.allocated.toString());
    setEditSpent(item.spent.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAllocated('');
    setEditSpent('');
  };

  const saveEdit = async (item: typeof BUDGET_DATA[0]) => {
    const newAllocated = parseFloat(editAllocated);
    const newSpent = parseFloat(editSpent);
    if (isNaN(newAllocated) || isNaN(newSpent) || newAllocated <= 0) {
      toast.error('Please enter valid amounts.');
      return;
    }
    if (newSpent > newAllocated) {
      toast.error('Spent amount cannot exceed allocated amount.');
      return;
    }
    setSaving(true);
    try {
      await updateBudgetItem(item.id, {
        allocated_amount: newAllocated * 10000000,
        spent_amount: newSpent * 10000000,
      });
      setBudgetData(prev => prev.map(d =>
        d.id === item.id ? { ...d, allocated: newAllocated, spent: newSpent } : d
      ));
      setEditingId(null);
      toast.success(`${item.department} budget updated!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update budget.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = selectedDept === 'all'
    ? budgetData
    : budgetData.filter((d) => d.department === selectedDept);

  const totalAllocated = filtered.reduce((s, d) => s + d.allocated, 0);
  const totalSpent     = filtered.reduce((s, d) => s + d.spent, 0);
  const overallPct     = pct(totalSpent, totalAllocated);

  // Bar chart data
  const barData = {
    labels: filtered.map((d) => d.department.split(' ').slice(0, 2).join(' ')),
    datasets: [
      {
        label: t('budget.allocated'),
        data: filtered.map((d) => d.allocated),
        backgroundColor: 'rgba(26, 79, 160, 0.85)',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: t('budget.spent'),
        data: filtered.map((d) => d.spent),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 13, weight: 'bold' as const },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ₹${ctx.raw} Cr`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          callback: (v: any) => `₹${v}Cr`,
          font: { size: 11 },
        },
      },
    },
  };

  // Doughnut chart
  const doughnutData = {
    labels: budgetData.map((d) => d.department.split(' ')[0]),
    datasets: [
      {
        data: budgetData.map((d) => d.allocated),
        backgroundColor: DEPT_COLORS,
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 8,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 14,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ₹${ctx.raw} Cr (${Math.round((ctx.raw / totalAllocated) * 100)}%)`,
        },
      },
    },
  };

  return (
    <div className="page-container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      {/* Header */}
      <div className="page-header animate-fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart2 size={28} /> {t('budget.title')}
          </h1>
          <p className="page-subtitle">{t('budget.subtitle')}</p>
        </div>
        {isGov && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 16px', borderRadius: 20,
            background: '#dbeafe', color: '#1e40af',
            fontSize: '0.78rem', fontWeight: 700,
          }}>
            <Shield size={14} /> Government Editor Mode
          </span>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid-4 animate-fade-in-up delay-100" style={{ marginBottom: 28 }}>
        {[
          { label: t('budget.totalAllocated'), value: fmt(totalAllocated), icon: <Banknote size={28} />, color: '#1a4fa0' },
          { label: t('budget.totalSpent'),     value: fmt(totalSpent),     icon: <TrendingDown size={28} />, color: '#10b981' },
          { label: t('budget.utilizationRate'), value: `${overallPct}%`,   icon: <TrendingUp size={28} />, color: overallPct >= 80 ? '#10b981' : '#f59e0b' },
          { label: 'Fiscal Year', value: '2024–25', icon: <Calendar size={28} />, color: '#8b5cf6' },
        ].map((stat) => (
          <div key={stat.label} className="stat-card" style={{ borderTop: `3px solid ${stat.color}` }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{stat.icon}</div>
            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>{t('budget.department')}:</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            id="filter-all"
            onClick={() => setSelectedDept('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1.5px solid',
              borderColor: selectedDept === 'all' ? 'var(--color-primary)' : 'var(--border-color)',
              background: selectedDept === 'all' ? 'var(--color-primary)' : 'white',
              color: selectedDept === 'all' ? 'white' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t('budget.allDepartments')}
          </button>
          {budgetData.map((d) => (
            <button
              key={d.department}
              id={`filter-${d.department.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setSelectedDept(d.department)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '1.5px solid',
                borderColor: selectedDept === d.department ? 'var(--color-primary)' : 'var(--border-color)',
                background: selectedDept === d.department ? 'var(--color-primary)' : 'white',
                color: selectedDept === d.department ? 'white' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {d.department.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid-2 animate-fade-in-up delay-200" style={{ marginBottom: 32 }}>
        {/* Bar Chart */}
        <div className="civic-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={18} /> {t('budget.chartTitle')} (₹ Crore)
          </h2>
          <div style={{ height: 300 }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        {/* Doughnut Chart */}
        <div className="civic-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PieChart size={18} /> {t('budget.breakdownTitle')}
          </h2>
          <div style={{ height: 300 }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Department Table */}
      <div className="civic-card animate-fade-in-up delay-300" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #0f2d5c, #1a4fa0)',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.95rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} /> Department-wise Breakdown
          </span>
          {isGov && (
            <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Edit3 size={12} /> Click Edit to modify allocations
            </span>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {[t('budget.department'), t('budget.allocated'), t('budget.spent'), t('budget.utilizationRate'), '', ...(isGov ? [''] : [])].map((h, i) => (
                  <th key={`${h}-${i}`} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {budgetData.map((d, i) => {
                const utilPct = pct(d.spent, d.allocated);
                const isEditing = editingId === d.id;
                return (
                  <tr
                    key={d.department}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s',
                      background: isEditing ? '#eff6ff' : 'white',
                    }}
                    onMouseEnter={(e) => { if (!isEditing) (e.currentTarget as HTMLTableRowElement).style.background = '#f8fafc'; }}
                    onMouseLeave={(e) => { if (!isEditing) (e.currentTarget as HTMLTableRowElement).style.background = 'white'; }}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: DEPT_COLORS[i], flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.department}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.category}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editAllocated}
                          onChange={(e) => setEditAllocated(e.target.value)}
                          step="0.1"
                          min="0"
                          style={{
                            width: 100, padding: '6px 10px', borderRadius: 8,
                            border: '1.5px solid #2563eb', fontSize: '0.85rem',
                            outline: 'none', background: 'white', fontWeight: 600,
                          }}
                        />
                      ) : (
                        `₹${d.allocated} Cr`
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#10b981' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editSpent}
                          onChange={(e) => setEditSpent(e.target.value)}
                          step="0.1"
                          min="0"
                          style={{
                            width: 100, padding: '6px 10px', borderRadius: 8,
                            border: '1.5px solid #10b981', fontSize: '0.85rem',
                            outline: 'none', background: 'white', fontWeight: 600, color: '#10b981',
                          }}
                        />
                      ) : (
                        `₹${d.spent} Cr`
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${utilPct}%`,
                              background: utilPct >= 80 ? '#10b981' : utilPct >= 50 ? '#f59e0b' : '#ef4444',
                              borderRadius: 4,
                              transition: 'width 0.8s ease',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: 36, color: utilPct >= 80 ? '#10b981' : '#f59e0b' }}>
                          {utilPct}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        className="badge"
                        style={{
                          background: utilPct >= 80 ? '#d1fae5' : utilPct >= 50 ? '#fef3c7' : '#fee2e2',
                          color: utilPct >= 80 ? '#065f46' : utilPct >= 50 ? '#92400e' : '#991b1b',
                        }}
                      >
                        {utilPct >= 80 ? <span style={{display:'flex', alignItems:'center', gap: 4}}><CheckCircle2 size={12} /> On Track</span> : 
                         utilPct >= 50 ? <span style={{display:'flex', alignItems:'center', gap: 4}}><AlertTriangle size={12} /> Moderate</span> : 
                         <span style={{display:'flex', alignItems:'center', gap: 4}}><AlertCircle size={12} /> Low</span>}
                      </span>
                    </td>
                    {isGov && (
                      <td style={{ padding: '16px 20px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => saveEdit(d)}
                              disabled={saving}
                              style={{
                                padding: '5px 12px', borderRadius: 8, border: 'none',
                                background: '#10b981', color: 'white', fontSize: '0.75rem',
                                fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                opacity: saving ? 0.6 : 1,
                              }}
                            >
                              {saving ? '...' : <span style={{display:'flex', alignItems:'center', gap:4}}><Check size={12} /> Save</span>}
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={{
                                padding: '5px 12px', borderRadius: 8,
                                border: '1px solid #e2e8f0', background: 'white',
                                color: '#64748b', fontSize: '0.75rem', fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(d)}
                            style={{
                              padding: '5px 14px', borderRadius: 8,
                              border: '1.5px solid #e2e8f0', background: 'white',
                              color: '#2563eb', fontSize: '0.75rem', fontWeight: 700,
                              cursor: 'pointer', transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#2563eb'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                          >
                            <span style={{display:'flex', alignItems:'center', gap:4}}><Edit3 size={12} /> Edit</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
