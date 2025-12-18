import { useMemo } from 'react';
import type { ClusterMetrics, NodeHealth, Workload } from '@/types';

interface ClusterOverviewProps {
  clusterMetrics: ClusterMetrics | null;
  nodes: Map<string, NodeHealth>;
  workloads: Map<string, Workload>;
  onClose?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function ClusterOverview({
  clusterMetrics,
  nodes,
  workloads,
  onClose,
}: ClusterOverviewProps) {
  // Calculate live stats from actual data
  const liveStats = useMemo(() => {
    const nodesList = Array.from(nodes.values());
    const workloadsList = Array.from(workloads.values());

    return {
      nodes: {
        total: nodesList.length,
        healthy: nodesList.filter(n => n.status === 'healthy' || n.status === 'Ready').length,
        degraded: nodesList.filter(n => n.status === 'degraded').length,
        unhealthy: nodesList.filter(n => n.status === 'unhealthy' || n.status === 'NotReady').length,
        offline: nodesList.filter(n => n.status === 'offline').length,
      },
      workloads: {
        total: workloadsList.length,
        running: workloadsList.filter(w => w.status === 'running').length,
        pending: workloadsList.filter(w => w.status === 'pending').length,
        completed: workloadsList.filter(w => w.status === 'completed').length,
        failed: workloadsList.filter(w => w.status === 'failed').length,
      },
      resources: {
        // Handle both real API (resources_capacity) and mock format (cpu/memory/disk)
        totalCpu: nodesList.reduce((acc, n) => acc + (n.resources_capacity?.cpu_cores ?? n.cpu?.cores ?? 0), 0),
        usedCpu: nodesList.reduce((acc, n) => {
          if (n.resources_capacity?.cpu_cores) {
            const used = n.resources_capacity.cpu_cores - (n.resources_allocatable?.cpu_cores ?? 0);
            return acc + used;
          }
          return acc + ((n.cpu?.cores ?? 0) * (n.cpu?.usage ?? 0) / 100);
        }, 0),
        totalMemory: nodesList.reduce((acc, n) => acc + ((n.resources_capacity?.memory_mb ?? 0) * 1024 * 1024 || n.memory?.total || 0), 0),
        usedMemory: nodesList.reduce((acc, n) => {
          if (n.resources_capacity?.memory_mb) {
            const usedMb = n.resources_capacity.memory_mb - (n.resources_allocatable?.memory_mb ?? 0);
            return acc + usedMb * 1024 * 1024;
          }
          return acc + (n.memory?.used ?? 0);
        }, 0),
        totalStorage: nodesList.reduce((acc, n) => acc + ((n.resources_capacity?.disk_mb ?? 0) * 1024 * 1024 || n.disk?.total || 0), 0),
        usedStorage: nodesList.reduce((acc, n) => {
          if (n.resources_capacity?.disk_mb) {
            const usedMb = n.resources_capacity.disk_mb - (n.resources_allocatable?.disk_mb ?? 0);
            return acc + usedMb * 1024 * 1024;
          }
          return acc + (n.disk?.used ?? 0);
        }, 0),
      },
    };
  }, [nodes, workloads]);

  const metrics = clusterMetrics || {
    clusterId: 'cluster-primary',
    clusterName: 'Mycelial Primary Cluster',
    totalNodes: liveStats.nodes.total,
    healthyNodes: liveStats.nodes.healthy,
    degradedNodes: liveStats.nodes.degraded,
    offlineNodes: liveStats.nodes.offline,
    totalWorkloads: liveStats.workloads.total,
    runningWorkloads: liveStats.workloads.running,
    pendingWorkloads: liveStats.workloads.pending,
    completedWorkloads: liveStats.workloads.completed,
    failedWorkloads: liveStats.workloads.failed,
    resources: liveStats.resources,
    throughput: {
      workloadsPerHour: 45,
      avgCompletionTime: 127000,
      successRate: liveStats.workloads.total > 0
        ? (liveStats.workloads.completed / (liveStats.workloads.completed + liveStats.workloads.failed) * 100) || 0
        : 0,
    },
    lastUpdated: Date.now(),
  };

  const healthPercentage = metrics.totalNodes > 0
    ? Math.round((metrics.healthyNodes / metrics.totalNodes) * 100)
    : 0;

  // Safely access resources with fallback to liveStats
  const resources = metrics.resources || liveStats.resources || {
    totalCpu: 0, usedCpu: 0,
    totalMemory: 0, usedMemory: 0,
    totalStorage: 0, usedStorage: 0,
  };

  const cpuUsagePercent = resources.totalCpu > 0
    ? Math.round((resources.usedCpu / resources.totalCpu) * 100)
    : 0;

  const memoryUsagePercent = resources.totalMemory > 0
    ? Math.round((resources.usedMemory / resources.totalMemory) * 100)
    : 0;

  const storageUsagePercent = resources.totalStorage > 0
    ? Math.round((resources.usedStorage / resources.totalStorage) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[90vh] bg-forest-floor border border-border-subtle rounded-xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-4 bg-deep-earth border-b border-border-subtle">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-glow-cyan via-spore-purple to-glow-gold" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-display font-bold text-mycelium-white flex items-center gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-gold">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                Cluster Overview
              </h2>
              <p className="text-sm text-soft-gray font-body">
                {metrics.clusterName} • Updated {formatTimeAgo(metrics.lastUpdated)}
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-soft-gray hover:text-mycelium-white transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Cluster Health Score */}
          <div className="mb-6 p-6 bg-moss rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-display uppercase tracking-wider text-soft-gray mb-2">
                  Cluster Health Score
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-display font-bold ${
                    healthPercentage >= 80 ? 'text-green-400' :
                    healthPercentage >= 60 ? 'text-glow-gold' : 'text-red-400'
                  }`}>
                    {healthPercentage}%
                  </span>
                  <span className="text-soft-gray text-lg">healthy</span>
                </div>
              </div>
              <div className="relative w-32 h-32">
                {/* Animated rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute w-24 h-24 rounded-full border-2 border-glow-cyan/30 animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute w-28 h-28 rounded-full border border-spore-purple/20 animate-ping" style={{ animationDuration: '4s' }} />
                </div>
                <div className={`relative w-full h-full rounded-full flex items-center justify-center ${
                  healthPercentage >= 80 ? 'bg-green-400/20' :
                  healthPercentage >= 60 ? 'bg-glow-gold/20' : 'bg-red-400/20'
                }`}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={
                    healthPercentage >= 80 ? 'text-green-400' :
                    healthPercentage >= 60 ? 'text-glow-gold' : 'text-red-400'
                  }>
                    {healthPercentage >= 80 ? (
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                    ) : healthPercentage >= 60 ? (
                      <>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                      </>
                    ) : (
                      <>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M15 9l-6 6M9 9l6 6" />
                      </>
                    )}
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Node Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Nodes', value: metrics.totalNodes, color: 'text-mycelium-white', bgColor: 'bg-moss' },
              { label: 'Healthy', value: metrics.healthyNodes, color: 'text-green-400', bgColor: 'bg-green-400/10' },
              { label: 'Degraded', value: metrics.degradedNodes, color: 'text-glow-gold', bgColor: 'bg-glow-gold/10' },
              { label: 'Offline', value: metrics.offlineNodes, color: 'text-red-400', bgColor: 'bg-red-400/10' },
            ].map(item => (
              <div key={item.label} className={`p-4 rounded-lg ${item.bgColor}`}>
                <div className={`text-3xl font-display font-bold ${item.color}`}>{item.value}</div>
                <div className="text-sm text-soft-gray">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Resource Usage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* CPU */}
            <div className="p-4 bg-moss rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-cyan">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="9" y="9" width="6" height="6" />
                    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
                  </svg>
                  <span className="font-display text-mycelium-white">CPU</span>
                </div>
                <span className="text-glow-cyan font-display font-bold">{cpuUsagePercent}%</span>
              </div>
              <div className="h-3 bg-bark rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    cpuUsagePercent > 80 ? 'bg-red-400' :
                    cpuUsagePercent > 60 ? 'bg-glow-gold' : 'bg-glow-cyan'
                  }`}
                  style={{ width: `${cpuUsagePercent}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-soft-gray">
                {Math.round(resources.usedCpu)} / {resources.totalCpu} cores
              </div>
            </div>

            {/* Memory */}
            <div className="p-4 bg-moss rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-spore-purple">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <path d="M6 6V4a2 2 0 012-2h8a2 2 0 012 2v2M6 18v2a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  <span className="font-display text-mycelium-white">Memory</span>
                </div>
                <span className="text-spore-purple font-display font-bold">{memoryUsagePercent}%</span>
              </div>
              <div className="h-3 bg-bark rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    memoryUsagePercent > 80 ? 'bg-red-400' :
                    memoryUsagePercent > 60 ? 'bg-glow-gold' : 'bg-spore-purple'
                  }`}
                  style={{ width: `${memoryUsagePercent}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-soft-gray">
                {formatBytes(resources.usedMemory)} / {formatBytes(resources.totalMemory)}
              </div>
            </div>

            {/* Storage */}
            <div className="p-4 bg-moss rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-gold">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  </svg>
                  <span className="font-display text-mycelium-white">Storage</span>
                </div>
                <span className="text-glow-gold font-display font-bold">{storageUsagePercent}%</span>
              </div>
              <div className="h-3 bg-bark rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    storageUsagePercent > 80 ? 'bg-red-400' :
                    storageUsagePercent > 60 ? 'bg-glow-gold' : 'bg-glow-gold'
                  }`}
                  style={{ width: `${storageUsagePercent}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-soft-gray">
                {formatBytes(resources.usedStorage)} / {formatBytes(resources.totalStorage)}
              </div>
            </div>
          </div>

          {/* Workload Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Workload Distribution */}
            <div className="p-4 bg-moss rounded-lg">
              <h3 className="text-sm font-display uppercase tracking-wider text-soft-gray mb-4">
                Workload Distribution
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Running', value: metrics.runningWorkloads, color: 'text-glow-cyan', bgColor: 'bg-glow-cyan/20' },
                  { label: 'Pending', value: metrics.pendingWorkloads, color: 'text-glow-gold', bgColor: 'bg-glow-gold/20' },
                  { label: 'Done', value: metrics.completedWorkloads, color: 'text-green-400', bgColor: 'bg-green-400/20' },
                  { label: 'Failed', value: metrics.failedWorkloads, color: 'text-red-400', bgColor: 'bg-red-400/20' },
                ].map(item => (
                  <div key={item.label} className={`p-3 rounded-lg ${item.bgColor} text-center`}>
                    <div className={`text-2xl font-display font-bold ${item.color}`}>{item.value}</div>
                    <div className="text-xs text-soft-gray">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Progress bar showing distribution */}
              <div className="mt-4 h-4 bg-bark rounded-full overflow-hidden flex">
                {metrics.totalWorkloads > 0 && (
                  <>
                    <div
                      className="h-full bg-glow-cyan transition-all"
                      style={{ width: `${(metrics.runningWorkloads / metrics.totalWorkloads) * 100}%` }}
                    />
                    <div
                      className="h-full bg-glow-gold transition-all"
                      style={{ width: `${(metrics.pendingWorkloads / metrics.totalWorkloads) * 100}%` }}
                    />
                    <div
                      className="h-full bg-green-400 transition-all"
                      style={{ width: `${(metrics.completedWorkloads / metrics.totalWorkloads) * 100}%` }}
                    />
                    <div
                      className="h-full bg-red-400 transition-all"
                      style={{ width: `${(metrics.failedWorkloads / metrics.totalWorkloads) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Throughput */}
            <div className="p-4 bg-moss rounded-lg">
              <h3 className="text-sm font-display uppercase tracking-wider text-soft-gray mb-4">
                Throughput Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-cyan">
                      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                    </svg>
                    <span className="text-soft-gray">Workloads/hour</span>
                  </div>
                  <span className="text-xl font-display font-bold text-glow-cyan">
                    {metrics.throughput?.workloadsPerHour ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-spore-purple">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                    <span className="text-soft-gray">Avg completion</span>
                  </div>
                  <span className="text-xl font-display font-bold text-spore-purple">
                    {formatDuration(metrics.throughput?.avgCompletionTime ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                    </svg>
                    <span className="text-soft-gray">Success rate</span>
                  </div>
                  <span className={`text-xl font-display font-bold ${
                    (metrics.throughput?.successRate ?? 0) >= 95 ? 'text-green-400' :
                    (metrics.throughput?.successRate ?? 0) >= 80 ? 'text-glow-gold' : 'text-red-400'
                  }`}>
                    {(metrics.throughput?.successRate ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Activity */}
          <div className="p-4 bg-moss rounded-lg">
            <h3 className="text-sm font-display uppercase tracking-wider text-soft-gray mb-4">
              Live Activity
            </h3>
            <div className="relative h-24 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-around">
                {/* Animated nodes */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="relative"
                    style={{
                      animation: `pulse ${2 + i * 0.3}s ease-in-out infinite`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  >
                    <div className={`w-4 h-4 rounded-full ${
                      i < metrics.healthyNodes ? 'bg-green-400' :
                      i < metrics.healthyNodes + metrics.degradedNodes ? 'bg-glow-gold' : 'bg-red-400'
                    } animate-pulse`} />
                    <div
                      className={`absolute inset-0 rounded-full ${
                        i < metrics.healthyNodes ? 'bg-green-400/30' : 'bg-glow-gold/30'
                      } animate-ping`}
                      style={{ animationDuration: '2s' }}
                    />
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg className="w-full h-full opacity-20" viewBox="0 0 400 100">
                  <path
                    d="M0,50 Q100,20 200,50 T400,50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-glow-cyan"
                  />
                  <path
                    d="M0,50 Q100,80 200,50 T400,50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-spore-purple"
                  />
                </svg>
              </div>
            </div>
            <p className="text-center text-soft-gray text-sm mt-2">
              {metrics.runningWorkloads} workloads actively processing across {metrics.healthyNodes} healthy nodes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
