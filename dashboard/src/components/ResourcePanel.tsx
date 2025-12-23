import { useState, useMemo } from 'react';
import type { NormalizedPeer, ResourceMetrics, ResourcePool } from '@/types';

interface ResourcePanelProps {
  localPeerId: string | null;
  peers: Map<string, NormalizedPeer>;
  resourcePool?: ResourcePool | null;
  onClose?: () => void;
}

// Mock data for demonstration
function getMockResourceMetrics(peerId: string): ResourceMetrics {
  const seed = peerId.charCodeAt(0) + peerId.charCodeAt(1);
  return {
    peerId,
    bandwidth: {
      uploaded: Math.floor((seed * 12345) % 10000000000),
      downloaded: Math.floor((seed * 54321) % 15000000000),
      uploadRate: Math.floor((seed * 111) % 1000000),
      downloadRate: Math.floor((seed * 222) % 2000000),
    },
    storage: {
      provided: Math.floor((seed * 99999) % 50000000000),
      used: Math.floor((seed * 44444) % 30000000000),
      available: Math.floor((seed * 55555) % 20000000000),
    },
    compute: {
      tasksCompleted: Math.floor((seed * 77) % 1000),
      averageLatency: Math.floor((seed * 3) % 200) + 10,
      cpuContributed: Math.floor((seed * 5) % 100),
    },
    uptime: Math.floor((seed * 3600) % (86400 * 30)),
    lastUpdated: Date.now() - Math.floor((seed * 1000) % 60000),
  };
}

function getMockResourcePool(peers: Map<string, NormalizedPeer>): ResourcePool {
  const peerList = Array.from(peers.entries());
  const topContributors = peerList.slice(0, 5).map(([peerId, peer]) => ({
    peerId,
    peerName: peer.name,
    contribution: Math.floor(Math.random() * 1000) + 100,
    resourceType: ['bandwidth', 'storage', 'compute'][Math.floor(Math.random() * 3)],
  }));

  return {
    totalBandwidth: Math.floor(Math.random() * 100) + 50,
    totalStorage: Math.floor(Math.random() * 500) + 100,
    totalCompute: Math.floor(Math.random() * 200) + 20,
    activeContributors: peers.size,
    topContributors,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function ResourcePanel({
  localPeerId,
  peers,
  resourcePool: externalResourcePool,
  onClose,
}: ResourcePanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'my-resources' | 'network'>('overview');

  // Use external data if provided, otherwise fall back to mock data
  const resourcePool = useMemo(
    () => externalResourcePool || getMockResourcePool(peers),
    [externalResourcePool, peers]
  );
  const localMetrics = useMemo(() =>
    localPeerId ? getMockResourceMetrics(localPeerId) : null,
  [localPeerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-forest-floor border border-border-subtle rounded-xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-4 bg-deep-earth border-b border-border-subtle">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-glow-cyan via-spore-purple to-glow-gold" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-display font-bold text-mycelium-white">
                Resource Sharing
              </h2>
              <p className="text-sm text-soft-gray font-body">
                Network resource contributions and metrics
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

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {(['overview', 'my-resources', 'network'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-display transition-colors ${
                  activeTab === tab
                    ? 'bg-glow-cyan/20 text-glow-cyan'
                    : 'text-soft-gray hover:text-mycelium-white hover:bg-moss'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'my-resources' && 'My Resources'}
                {tab === 'network' && 'Network Pool'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Pool Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-moss rounded-lg text-center">
                  <div className="text-2xl font-display font-bold text-glow-cyan">
                    {resourcePool.activeContributors}
                  </div>
                  <div className="text-xs text-soft-gray uppercase tracking-wider">
                    Contributors
                  </div>
                </div>
                <div className="p-4 bg-moss rounded-lg text-center">
                  <div className="text-2xl font-display font-bold text-glow-gold">
                    {resourcePool.totalBandwidth} Gbps
                  </div>
                  <div className="text-xs text-soft-gray uppercase tracking-wider">
                    Bandwidth
                  </div>
                </div>
                <div className="p-4 bg-moss rounded-lg text-center">
                  <div className="text-2xl font-display font-bold text-spore-purple">
                    {resourcePool.totalStorage} TB
                  </div>
                  <div className="text-xs text-soft-gray uppercase tracking-wider">
                    Storage
                  </div>
                </div>
                <div className="p-4 bg-moss rounded-lg text-center">
                  <div className="text-2xl font-display font-bold text-glow-cyan">
                    {resourcePool.totalCompute}
                  </div>
                  <div className="text-xs text-soft-gray uppercase tracking-wider">
                    Compute Units
                  </div>
                </div>
              </div>

              {/* Resource Flow Visualization */}
              <div className="p-4 bg-moss rounded-lg">
                <h3 className="text-sm font-display uppercase tracking-wider text-soft-gray mb-4">
                  Resource Flow
                </h3>
                <div className="relative h-32 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Animated rings */}
                    <div className="absolute w-24 h-24 rounded-full border border-glow-cyan/30 animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute w-32 h-32 rounded-full border border-spore-purple/20 animate-ping" style={{ animationDuration: '4s' }} />
                    <div className="absolute w-40 h-40 rounded-full border border-glow-gold/10 animate-ping" style={{ animationDuration: '5s' }} />
                  </div>
                  <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-glow-cyan to-spore-purple flex items-center justify-center shadow-glow-lg">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mycelium-white">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
                    </svg>
                  </div>
                </div>
                <p className="text-center text-soft-gray text-sm mt-2">
                  Resources flow through the mycelial network
                </p>
              </div>

              {/* Top Contributors */}
              <div>
                <h3 className="text-sm font-display uppercase tracking-wider text-soft-gray mb-3">
                  Top Contributors
                </h3>
                <div className="space-y-2">
                  {resourcePool.topContributors.map((contributor, idx) => (
                    <div
                      key={contributor.peerId}
                      className="flex items-center justify-between p-3 bg-moss rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-glow-cyan/20 flex items-center justify-center text-glow-cyan font-display font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-display text-mycelium-white">
                            {contributor.peerName}
                          </div>
                          <div className="text-xs text-soft-gray capitalize">
                            {contributor.resourceType}
                          </div>
                        </div>
                      </div>
                      <div className="text-glow-gold font-display font-bold">
                        {contributor.contribution} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'my-resources' && (
            <div className="space-y-6">
              {localMetrics ? (
                <>
                  {/* Bandwidth */}
                  <div className="p-4 bg-moss rounded-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-cyan">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                      <h3 className="text-sm font-display uppercase tracking-wider text-soft-gray">
                        Bandwidth Contribution
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-soft-gray">Uploaded</div>
                        <div className="text-lg font-display text-glow-cyan">
                          {formatBytes(localMetrics.bandwidth.uploaded)}
                        </div>
                        <div className="text-xs text-soft-gray/60">
                          {formatBytes(localMetrics.bandwidth.uploadRate)}/s
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-soft-gray">Downloaded</div>
                        <div className="text-lg font-display text-glow-gold">
                          {formatBytes(localMetrics.bandwidth.downloaded)}
                        </div>
                        <div className="text-xs text-soft-gray/60">
                          {formatBytes(localMetrics.bandwidth.downloadRate)}/s
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-soft-gray mb-1">
                        <span>Upload/Download Ratio</span>
                        <span>{(localMetrics.bandwidth.uploaded / Math.max(localMetrics.bandwidth.downloaded, 1)).toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-bark rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-glow-cyan to-glow-gold"
                          style={{
                            width: `${Math.min(100, (localMetrics.bandwidth.uploaded / (localMetrics.bandwidth.uploaded + localMetrics.bandwidth.downloaded)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Storage */}
                  <div className="p-4 bg-moss rounded-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-spore-purple">
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                      </svg>
                      <h3 className="text-sm font-display uppercase tracking-wider text-soft-gray">
                        Storage Contribution
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-soft-gray">Provided</div>
                        <div className="text-lg font-display text-spore-purple">
                          {formatBytes(localMetrics.storage.provided)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-soft-gray">Used</div>
                        <div className="text-lg font-display text-glow-gold">
                          {formatBytes(localMetrics.storage.used)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-soft-gray">Available</div>
                        <div className="text-lg font-display text-glow-cyan">
                          {formatBytes(localMetrics.storage.available)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-soft-gray mb-1">
                        <span>Storage Utilization</span>
                        <span>{Math.round((localMetrics.storage.used / Math.max(localMetrics.storage.provided, 1)) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-bark rounded-full overflow-hidden">
                        <div
                          className="h-full bg-spore-purple"
                          style={{
                            width: `${Math.min(100, (localMetrics.storage.used / Math.max(localMetrics.storage.provided, 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Compute */}
                  <div className="p-4 bg-moss rounded-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-gold">
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                        <rect x="9" y="9" width="6" height="6" />
                        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
                      </svg>
                      <h3 className="text-sm font-display uppercase tracking-wider text-soft-gray">
                        Compute Contribution
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-soft-gray">Tasks Done</div>
                        <div className="text-lg font-display text-glow-gold">
                          {localMetrics.compute.tasksCompleted}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-soft-gray">Avg Latency</div>
                        <div className="text-lg font-display text-glow-cyan">
                          {localMetrics.compute.averageLatency}ms
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-soft-gray">CPU Hours</div>
                        <div className="text-lg font-display text-spore-purple">
                          {localMetrics.compute.cpuContributed}h
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Uptime */}
                  <div className="flex items-center justify-between p-4 bg-moss rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-glow-cyan/20 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-cyan">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12,6 12,12 16,14" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-display text-soft-gray">Node Uptime</div>
                        <div className="text-lg font-display text-mycelium-white">
                          {formatDuration(localMetrics.uptime)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-soft-gray">Availability</div>
                      <div className="text-lg font-display text-glow-cyan">
                        {Math.min(99.9, 95 + Math.random() * 4.9).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-moss flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-soft-gray">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                  </div>
                  <p className="text-soft-gray">
                    Connect to the network to view your resource contributions
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'network' && (
            <div className="space-y-6">
              {/* Network Health */}
              <div className="p-4 bg-moss rounded-lg">
                <h3 className="text-sm font-display uppercase tracking-wider text-soft-gray mb-4">
                  Network Health
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-glow-cyan/20 flex items-center justify-center">
                      <span className="text-2xl font-display font-bold text-glow-cyan">A+</span>
                    </div>
                    <div className="text-xs text-soft-gray">Bandwidth</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-spore-purple/20 flex items-center justify-center">
                      <span className="text-2xl font-display font-bold text-spore-purple">A</span>
                    </div>
                    <div className="text-xs text-soft-gray">Storage</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-glow-gold/20 flex items-center justify-center">
                      <span className="text-2xl font-display font-bold text-glow-gold">B+</span>
                    </div>
                    <div className="text-xs text-soft-gray">Compute</div>
                  </div>
                </div>
              </div>

              {/* Peer Resources */}
              <div>
                <h3 className="text-sm font-display uppercase tracking-wider text-soft-gray mb-3">
                  Peer Resource Contributions
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Array.from(peers.entries()).map(([peerId, peer]) => {
                    const metrics = getMockResourceMetrics(peerId);
                    return (
                      <div
                        key={peerId}
                        className="flex items-center justify-between p-3 bg-moss rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-glow-cyan/20 flex items-center justify-center text-glow-cyan font-display font-bold text-sm">
                            {peer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-display text-mycelium-white text-sm">
                              {peer.name}
                            </div>
                            <div className="text-xs text-soft-gray">
                              Uptime: {formatDuration(metrics.uptime)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <div className="text-center">
                            <div className="text-glow-cyan font-display">
                              {formatBytes(metrics.bandwidth.uploaded)}
                            </div>
                            <div className="text-soft-gray/60">↑</div>
                          </div>
                          <div className="text-center">
                            <div className="text-spore-purple font-display">
                              {formatBytes(metrics.storage.provided)}
                            </div>
                            <div className="text-soft-gray/60">💾</div>
                          </div>
                          <div className="text-center">
                            <div className="text-glow-gold font-display">
                              {metrics.compute.tasksCompleted}
                            </div>
                            <div className="text-soft-gray/60">⚡</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {peers.size === 0 && (
                    <div className="text-center py-8 text-soft-gray">
                      No peers connected
                    </div>
                  )}
                </div>
              </div>

              {/* Resource Distribution Chart */}
              <div className="p-4 bg-moss rounded-lg">
                <h3 className="text-sm font-display uppercase tracking-wider text-soft-gray mb-4">
                  Resource Distribution
                </h3>
                <div className="flex items-end justify-around h-32 gap-2">
                  {['Bandwidth', 'Storage', 'Compute'].map((resource, idx) => {
                    const heights = [75, 60, 45];
                    const colors = ['bg-glow-cyan', 'bg-spore-purple', 'bg-glow-gold'];
                    return (
                      <div key={resource} className="flex flex-col items-center gap-2 flex-1">
                        <div
                          className={`w-full max-w-16 rounded-t ${colors[idx]} transition-all duration-500`}
                          style={{ height: `${heights[idx]}%` }}
                        />
                        <span className="text-xs text-soft-gray">{resource}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
