import { Shield, Activity, AlertTriangle, Target, Award, CheckCircle, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';

export default function App() {
  const [metrics, setMetrics]   = useState<any>(null);
  const [cm, setCm]             = useState<any>(null);
  const [charts, setCharts]     = useState<any>(null);
  const [top10, setTop10]       = useState<any[]>([]);
  const [flagged, setFlagged]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const [typeFilter,   setTypeFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskScore,    setRiskScore]    = useState(0);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/metrics`).then(r => r.json()),
      fetch(`${API}/confusion-matrix`).then(r => r.json()),
      fetch(`${API}/charts`).then(r => r.json()),
      fetch(`${API}/top10`).then(r => r.json()),
      fetch(`${API}/flagged`).then(r => r.json()),
    ]).then(([m, c, ch, t, f]) => {
      setMetrics(m);
      setCm(c);
      setCharts(ch);
      setTop10(t);
      setFlagged(f);
      setLoading(false);
    }).catch(err => {
      console.error('API error:', err);
      setLoading(false);
    });
  }, []);

  const filteredFlagged = flagged.filter(txn => {
    const typeOk   = typeFilter === 'all' || txn.type === typeFilter;
    const statusOk = statusFilter === 'all' || txn.status.toLowerCase().replace(' ', '-') === statusFilter;
    const riskOk   = txn.risk >= riskScore;
    return typeOk && statusOk && riskOk;
  });

  const handleDownload = () => {
    window.open(`${API}/download`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#ff6b2b] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-lg font-semibold">Loading SafiriSec...</div>
          <div className="text-gray-400 text-sm mt-2">Connecting to fraud detection model</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181818] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* NAVBAR */}
      <nav className="bg-[#222222] border-b border-[#2e2e2e]" style={{ height: '68px' }}>
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#ff6b2b]" />
            <span className="font-bold text-xl">SafiriSec</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#ff6b2b]">
            <Activity className="w-4 h-4 text-[#ff6b2b]" />
            <span className="text-sm font-semibold">Live Monitoring</span>
          </div>
        </div>
      </nav>

      <div className="px-6 py-4 space-y-4">

        {/* METRIC CARDS */}
        <div className="grid grid-cols-5 gap-4">
          <MetricCard icon={<Activity className="w-6 h-6" />}
            value={metrics?.total?.toLocaleString() ?? '-'}
            label="Total Transactions" change={12.5} positive={true} />
          <MetricCard icon={<AlertTriangle className="w-6 h-6" />}
            value={metrics?.fraudAlerts?.toLocaleString() ?? '-'}
            label="Fraud Alerts" change={-3.2} positive={false} />
          <MetricCard icon={<Target className="w-6 h-6" />}
            value={`${metrics?.recallRate ?? '-'}%`}
            label="Recall Rate" change={2.1} positive={true} />
          <MetricCard icon={<Award className="w-6 h-6" />}
            value={`${metrics?.precisionRate ?? '-'}%`}
            label="Precision Rate" change={1.8} positive={true} />
          <MetricCard icon={<CheckCircle className="w-6 h-6" />}
            value={metrics?.confirmedFraud?.toLocaleString() ?? '-'}
            label="Confirmed Fraud" change={-5.4} positive={false} />
        </div>

        {/* THREE CHARTS */}
        <div className="grid grid-cols-3 gap-4">
          <ChartCard title="Fraud by Transaction Type">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts?.fraudByType ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                <XAxis dataKey="type" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={{ backgroundColor: '#222222', border: '1px solid #2e2e2e', borderRadius: '8px' }}
                  labelStyle={{ color: '#ffffff' }} formatter={(v: any) => [v.toLocaleString(), 'Count']} />
                <Bar dataKey="count" fill="#ff6b2b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Fraud by Time Step">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts?.fraudByTime ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                <XAxis dataKey="time" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={{ backgroundColor: '#222222', border: '1px solid #2e2e2e', borderRadius: '8px' }}
                  labelStyle={{ color: '#ffffff' }} formatter={(v: any) => [v.toLocaleString(), 'Count']} />
                <Bar dataKey="count" fill="#ff6b2b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Fraud by Amount KES">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts?.fraudByAmount ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                <XAxis dataKey="range" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={{ backgroundColor: '#222222', border: '1px solid #2e2e2e', borderRadius: '8px' }}
                  labelStyle={{ color: '#ffffff' }} formatter={(v: any) => [v.toLocaleString(), 'Count']} />
                <Bar dataKey="count" fill="#ff6b2b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* CONFUSION MATRIX + MODEL METRICS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#222222] rounded-2xl p-6 border border-[#2e2e2e]">
            <h3 className="font-bold text-xl mb-6">Confusion Matrix</h3>
            <div className="space-y-4">
              <div className="flex justify-center gap-16 mb-2">
                <div className="text-sm text-gray-400 font-semibold">Predicted Fraud</div>
                <div className="text-sm text-gray-400 font-semibold">Predicted Normal</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400 font-semibold w-24">Actual Fraud</div>
                <div className="flex gap-4 flex-1">
                  <div className="flex-1 bg-[#0d2d1a] rounded-xl p-6 text-center border border-green-900/30">
                    <div className="font-bold text-3xl mb-2">{cm?.truePositive?.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">True Positive</div>
                  </div>
                  <div className="flex-1 bg-[#2d0f0f] rounded-xl p-6 text-center border border-red-900/30">
                    <div className="font-bold text-3xl mb-2">{cm?.falseNegative?.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">False Negative</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400 font-semibold w-24">Actual Normal</div>
                <div className="flex gap-4 flex-1">
                  <div className="flex-1 bg-[#2d1f0a] rounded-xl p-6 text-center border border-amber-900/30">
                    <div className="font-bold text-3xl mb-2">{cm?.falsePositive?.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">False Positive</div>
                  </div>
                  <div className="flex-1 bg-[#0d2d1a] rounded-xl p-6 text-center border border-green-900/30">
                    <div className="font-bold text-3xl mb-2">{cm?.trueNegative?.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">True Negative</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#222222] rounded-2xl p-6 border border-[#2e2e2e]">
            <h3 className="font-bold text-xl mb-6">Model Performance Metrics</h3>
            <div className="space-y-3">
              <MetricRow name="Recall (Sensitivity)"
                formula={`TP / (TP + FN) = ${cm?.truePositive?.toLocaleString()} / ${(cm?.truePositive + cm?.falseNegative)?.toLocaleString()}`}
                value={`${cm?.recall}%`} />
              <MetricRow name="Precision"
                formula={`TP / (TP + FP) = ${cm?.truePositive?.toLocaleString()} / ${metrics?.fraudAlerts?.toLocaleString()}`}
                value={`${cm?.precision}%`} />
              <MetricRow name="Accuracy"
                formula={`(TP + TN) / Total`}
                value={`${cm?.accuracy}%`} />
              <MetricRow name="F1 Score"
                formula="2 × (Precision × Recall) / (Precision + Recall)"
                value={`${cm?.f1}%`} />
            </div>
          </div>
        </div>

        {/* TOP 10 HIGHEST RISK */}
        <div className="bg-[#222222] rounded-2xl p-6 border border-[#2e2e2e]">
          <h3 className="font-bold text-xl mb-6">Top 10 Highest Risk Transactions</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2e2e2e]">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Transaction ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Amount KES</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Sender Balance</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((txn) => (
                <tr key={txn.id} className="border-b border-[#2e2e2e]/50 hover:bg-[#2a2a2a] transition-colors">
                  <td className="py-4 px-4">
                    <div className="w-8 h-8 rounded-full bg-[#ff6b2b] flex items-center justify-center font-bold text-sm">
                      {txn.rank}
                    </div>
                  </td>
                  <td className="py-4 px-4 font-mono text-sm">{txn.id}</td>
                  <td className="py-4 px-4 font-semibold">{txn.amount}</td>
                  <td className="py-4 px-4">
                    <span className="text-sm bg-[#2a2a2a] px-3 py-1 rounded-full">{txn.type}</span>
                  </td>
                  <td className="py-4 px-4 text-gray-400">{txn.balance}</td>
                  <td className="py-4 px-4">
                    <span className={`font-bold ${txn.risk >= 95 ? 'text-red-400' : 'text-amber-400'}`}>
                      {txn.risk}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FLAGGED TRANSACTIONS */}
        <div className="bg-[#222222] rounded-2xl p-6 border border-[#2e2e2e]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-xl">Flagged Transactions</h3>
            <button onClick={handleDownload}
              className="flex items-center gap-2 bg-[#ff6b2b] hover:bg-[#e85d04] px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
              <Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <select className="bg-[#2a2a2a] border border-[#2e2e2e] rounded-lg px-4 py-2 text-sm flex-1 text-white"
              value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Transaction Types</option>
              <option value="CASH_OUT">CASH_OUT</option>
              <option value="TRANSFER">TRANSFER</option>
            </select>

            <select className="bg-[#2a2a2a] border border-[#2e2e2e] rounded-lg px-4 py-2 text-sm flex-1 text-white"
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="confirmed-fraud">Confirmed Fraud</option>
              <option value="under-review">Under Review</option>
              <option value="cleared">Cleared</option>
            </select>

            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm text-gray-400 whitespace-nowrap">Risk Score:</span>
              <input type="range" min="0" max="100" value={riskScore}
                onChange={(e) => setRiskScore(Number(e.target.value))}
                className="flex-1 accent-[#ff6b2b]" />
              <span className="text-sm font-semibold w-12">{riskScore}%</span>
            </div>
          </div>

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2e2e2e]">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Transaction ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Amount KES</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Sender Balance</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Risk Score</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlagged.map((txn) => (
                <tr key={txn.id} className="border-b border-[#2e2e2e]/50 hover:bg-[#2a2a2a] transition-colors">
                  <td className="py-4 px-4 font-mono text-sm">{txn.id}</td>
                  <td className="py-4 px-4 text-sm text-gray-400">{txn.timestamp}</td>
                  <td className="py-4 px-4 font-semibold">{txn.amount}</td>
                  <td className="py-4 px-4">
                    <span className="text-sm bg-[#2a2a2a] px-3 py-1 rounded-full">{txn.type}</span>
                  </td>
                  <td className="py-4 px-4 text-gray-400">{txn.balance}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${txn.risk >= 88 ? 'bg-red-500' : txn.risk >= 75 ? 'bg-amber-500' : 'bg-green-500'}`} />
                      <span className={`font-bold ${txn.risk >= 88 ? 'text-red-400' : txn.risk >= 75 ? 'text-amber-400' : 'text-green-400'}`}>
                        {txn.risk}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <StatusBadge status={txn.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

// ── Helper Components ─────────────────────────────────────────────────────────

function MetricCard({ icon, value, label, change, positive }: {
  icon: React.ReactNode; value: string; label: string; change: number; positive: boolean;
}) {
  return (
    <div className="bg-[#222222] rounded-2xl p-6 border border-[#2e2e2e]">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-full bg-[#ff6b2b] flex items-center justify-center text-white">
          {icon}
        </div>
        <span className={`text-sm font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
          {positive ? '+' : ''}{change}%
        </span>
      </div>
      <div className="font-bold text-3xl mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#222222] rounded-2xl p-6 border border-[#2e2e2e]">
      <h3 className="font-bold text-lg mb-4">{title}</h3>
      {children}
    </div>
  );
}

function MetricRow({ name, formula, value }: { name: string; formula: string; value: string }) {
  return (
    <div className="bg-[#2a2a2a] rounded-lg p-4 flex items-center justify-between">
      <div>
        <div className="font-semibold mb-1">{name}</div>
        <div className="text-xs text-gray-400">{formula}</div>
      </div>
      <div className="font-bold text-2xl">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'Confirmed Fraud': 'bg-[#2d0f0f] text-red-400 border border-red-900/30',
    'Under Review':    'bg-[#2d1f0a] text-amber-400 border border-amber-900/30',
    'Cleared':         'bg-[#0d2d1a] text-green-400 border border-green-900/30',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] ?? ''}`}>
      {status}
    </span>
  );
}