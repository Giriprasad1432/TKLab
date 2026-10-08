import React from 'react';
import { useCrowdSocket } from '../hooks/useCrowdSocket';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUp, Play, Square, AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';

const getRiskColor = (level) => {
  switch (level) {
    case 'SAFE': return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'WARNING': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    case 'CRITICAL': return 'text-red-500 bg-red-500/10 border-red-500/20';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
};

const getRiskIcon = (level) => {
  switch (level) {
    case 'SAFE': return <ShieldCheck className="w-6 h-6" />;
    case 'WARNING': return <AlertTriangle className="w-6 h-6" />;
    case 'CRITICAL': return <AlertCircle className="w-6 h-6" />;
    default: return null;
  }
};

const Heatmap = ({ zones, maxZonePeople }) => {
  const getAlpha = (val) => maxZonePeople > 0 ? Math.max(0.1, val / maxZonePeople) : 0.1;
  
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 h-full w-full bg-slate-800 rounded-lg p-2 aspect-video">
      {[...Array(9)].map((_, i) => {
        const val = zones?.[`zone_${i + 1}`] || 0;
        const isMax = val > 0 && val === maxZonePeople;
        return (
          <div 
            key={i} 
            className={`flex items-center justify-center rounded transition-all duration-300 ${isMax ? 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : ''}`}
            style={{ backgroundColor: `rgba(239, 68, 68, ${getAlpha(val)})` }}
          >
            <span className="text-white font-bold text-lg drop-shadow-md">{val}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function Dashboard() {
  const [capacity, setCapacity] = React.useState(20);
  const { data, history, status, connect, disconnect } = useCrowdSocket(`ws://localhost:8000/ws/analyze?capacity=${capacity}`);

  const chartData = history.map((item, i) => ({
    time: i,
    people: item.people_count,
    risk: item.risk_score,
    speed: item.average_speed
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 font-sans">
      
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 shadow-lg gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            TKLab Dashboard
          </h1>
          <div className="flex gap-2 items-center">
            {status !== 'CONNECTED' ? (
              <>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
                  <span className="text-sm text-slate-400">Capacity:</span>
                  <input 
                    type="number" 
                    value={capacity} 
                    onChange={e => setCapacity(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="bg-transparent text-white w-16 text-center outline-none font-mono"
                    min="1"
                  />
                </div>
                <button onClick={connect} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition">
                  <Play className="w-4 h-4" /> Connect
                </button>
              </>
            ) : (
              <button onClick={disconnect} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition">
                <Square className="w-4 h-4" /> Disconnect
              </button>
            )}
            <div className={`px-3 py-2 rounded-lg text-sm font-medium border flex items-center ${status === 'CONNECTED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              {status}
            </div>
          </div>
        </div>

        {data && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
             <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
               <span className="text-slate-400 block text-xs uppercase tracking-wider mb-1">FPS</span>
               <span className="font-mono font-bold text-lg">{data.fps?.toFixed(1) || '0.0'}</span>
             </div>
             <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
               <span className="text-slate-400 block text-xs uppercase tracking-wider mb-1">People</span>
               <span className="font-mono font-bold text-lg">{data.people_count}</span>
             </div>
             <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
               <span className="text-slate-400 block text-xs uppercase tracking-wider mb-1">Occupancy</span>
               <div className="flex items-baseline gap-2">
                 <span className="font-mono font-bold text-lg">{data.occupancy}%</span>
                 <span className={`text-xs px-2 py-0.5 rounded-full ${data.capacity_status === 'NORMAL' ? 'bg-green-500/20 text-green-300' : data.capacity_status === 'NEAR_CAPACITY' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                   {data.capacity_status}
                 </span>
               </div>
             </div>
             <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${getRiskColor(data.risk_level)}`}>
               {getRiskIcon(data.risk_level)}
               <div>
                 <span className="block text-xs uppercase tracking-wider font-semibold opacity-80">Risk Score</span>
                 <span className="font-mono font-bold text-xl">{data.risk_score} <span className="text-sm opacity-70">/100</span></span>
               </div>
             </div>
          </div>
        )}
      </div>

      {!data && status !== 'CONNECTED' && (
        <div className="flex flex-col items-center justify-center h-[60vh] border-2 border-dashed border-slate-800 rounded-xl gap-4">
          <p className="text-slate-500 text-lg">Set your site capacity and click Connect to start real-time analysis.</p>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-lg">
             <label className="text-slate-300 font-medium">Site Capacity:</label>
             <input 
                type="number" 
                value={capacity} 
                onChange={e => setCapacity(Math.max(1, parseInt(e.target.value) || 1))} 
                className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white outline-none focus:border-blue-500 w-24 text-center font-mono text-lg"
                min="1"
             />
             <button onClick={connect} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition flex items-center gap-2">
                <Play className="w-5 h-5" /> Start
             </button>
          </div>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Video Panel */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Live Camera Feed</h2>
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-800">
                {data.frame_base64 && (
                  <img 
                    src={`data:image/jpeg;base64,${data.frame_base64}`} 
                    alt="Live Frame" 
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* People Chart */}
               <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl h-48">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">People Count</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <Line type="monotone" dataKey="people" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
               {/* Risk Chart */}
               <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl h-48">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Risk Score</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <Line type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
               {/* Speed Chart */}
               <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl h-48">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Avg Speed</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <Line type="monotone" dataKey="speed" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <YAxis hide domain={[0, 'dataMax + 0.1']} />
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>

          {/* Side Panels */}
          <div className="space-y-6">
            
            {/* Heatmap Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Zone Density Heatmap</h2>
              <Heatmap zones={data.zone_density} maxZonePeople={data.max_zone_people} />
            </div>

            {/* Risk Factors */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Active Risk Factors</h2>
              {data.risk_factors && data.risk_factors.length > 0 ? (
                <div className="space-y-3">
                  {data.risk_factors.map((rf, idx) => (
                    <div key={idx} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                      <div>
                        <div className="text-slate-300 font-medium text-sm">{rf.reason}</div>
                        <div className="text-slate-500 text-xs font-mono mt-1">{rf.factor}</div>
                      </div>
                      <div className="bg-red-500/20 text-red-400 font-bold px-2 py-1 rounded text-sm">
                        +{rf.score}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">No significant risk factors detected.</div>
              )}
            </div>

            {/* Movement Indicators */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Crowd-Behavior Indicators</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Avg Speed</div>
                  <div className="text-lg font-mono">{data.average_speed?.toFixed(3)} <span className="text-xs text-slate-500">d/s</span></div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Acceleration</div>
                  <div className="text-lg font-mono">{data.average_acceleration?.toFixed(3)}</div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Direction</div>
                    <div className="text-lg font-mono">{data.dominant_direction?.toFixed(0)}°</div>
                  </div>
                  <ArrowUp className="w-5 h-5 text-indigo-400" style={{ transform: `rotate(${data.dominant_direction}deg)` }} />
                </div>
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Consistency</div>
                  <div className="text-lg font-mono">{(data.direction_consistency * 100)?.toFixed(1)}%</div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Coll. Move</div>
                  <div className="text-lg font-mono">{data.collective_movement_percentage?.toFixed(1)}%</div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Density Chg</div>
                  <div className="text-lg font-mono">{data.density_change?.toFixed(1)}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
