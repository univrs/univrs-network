import { useState, useCallback, useMemo } from 'react';
import type { CreditLine, CreditTransfer, NormalizedPeer } from '@/types';

interface CreditPanelProps {
  localPeerId: string | null;
  peers: Map<string, NormalizedPeer>;
  creditLines?: CreditLine[];
  creditTransfers?: CreditTransfer[];
  onCreateCreditLine?: (peerId: string, limit: number) => void;
  onTransfer?: (transfer: CreditTransfer) => void;
  onClose?: () => void;
}

// Mock data for demonstration
function getMockCreditLines(localPeerId: string | null, peers: Map<string, NormalizedPeer>): CreditLine[] {
  if (!localPeerId) return [];

  const peerIds = Array.from(peers.keys()).filter(id => id !== localPeerId);
  return peerIds.slice(0, 3).map((peerId, index) => ({
    id: `credit-${index}`,
    peerId1: localPeerId,
    peerId2: peerId,
    limit: (index + 1) * 100,
    balance: Math.floor(Math.random() * (index + 1) * 50) - 25,
    createdAt: Date.now() - Math.random() * 86400000 * 30,
    lastTransaction: Date.now() - Math.random() * 86400000 * 7,
  }));
}

function getMockTransactions(): CreditTransfer[] {
  return [
    {
      id: 'tx-1',
      from: 'peer-a',
      to: 'peer-b',
      amount: 25,
      memo: 'Payment for services',
      timestamp: Date.now() - 3600000,
    },
    {
      id: 'tx-2',
      from: 'peer-b',
      to: 'peer-a',
      amount: 10,
      memo: 'Partial return',
      timestamp: Date.now() - 7200000,
    },
    {
      id: 'tx-3',
      from: 'peer-c',
      to: 'peer-a',
      amount: 50,
      memo: 'Initial credit',
      timestamp: Date.now() - 86400000,
    },
  ];
}

export function CreditPanel({
  localPeerId,
  peers,
  creditLines: externalCreditLines,
  creditTransfers: externalCreditTransfers,
  onCreateCreditLine,
  onTransfer,
  onClose,
}: CreditPanelProps) {
  const [activeTab, setActiveTab] = useState<'lines' | 'transfer' | 'history'>('lines');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<string>('');
  const [creditLimit, setCreditLimit] = useState(100);
  const [transferTo, setTransferTo] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState(10);
  const [transferMemo, setTransferMemo] = useState('');

  // Use external data if provided, otherwise fall back to mock data
  const creditLines = useMemo(
    () => externalCreditLines && externalCreditLines.length > 0
      ? externalCreditLines
      : getMockCreditLines(localPeerId, peers),
    [externalCreditLines, localPeerId, peers]
  );

  const transactions = useMemo(
    () => externalCreditTransfers && externalCreditTransfers.length > 0
      ? externalCreditTransfers
      : getMockTransactions(),
    [externalCreditTransfers]
  );

  const availablePeers = useMemo(() => {
    const existingPeerIds = new Set(creditLines.map(cl =>
      cl.peerId1 === localPeerId ? cl.peerId2 : cl.peerId1
    ));
    return Array.from(peers.values()).filter(
      p => p.id !== localPeerId && !existingPeerIds.has(p.id)
    );
  }, [peers, creditLines, localPeerId]);

  const creditPeers = useMemo(() => {
    const peerIds = creditLines.map(cl =>
      cl.peerId1 === localPeerId ? cl.peerId2 : cl.peerId1
    );
    return Array.from(peers.values()).filter(p => peerIds.includes(p.id));
  }, [peers, creditLines, localPeerId]);

  const handleCreateCreditLine = useCallback(() => {
    if (!selectedPeer || !onCreateCreditLine) return;
    onCreateCreditLine(selectedPeer, creditLimit);
    setShowCreateModal(false);
    setSelectedPeer('');
    setCreditLimit(100);
  }, [selectedPeer, creditLimit, onCreateCreditLine]);

  const handleTransfer = useCallback(() => {
    if (!transferTo || !localPeerId || !onTransfer) return;
    const transfer: CreditTransfer = {
      id: `tx-${Date.now()}`,
      from: localPeerId,
      to: transferTo,
      amount: transferAmount,
      memo: transferMemo || undefined,
      timestamp: Date.now(),
    };
    onTransfer(transfer);
    setTransferTo('');
    setTransferAmount(10);
    setTransferMemo('');
  }, [transferTo, localPeerId, transferAmount, transferMemo, onTransfer]);

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const totalCredit = creditLines.reduce((sum, cl) => sum + cl.limit, 0);
  const totalBalance = creditLines.reduce((sum, cl) => sum + cl.balance, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-forest-floor border border-border-subtle rounded-xl shadow-card overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-glow-gold-dim flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-gold">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-mycelium-white">
                Mutual Credit
              </h2>
              <p className="text-sm text-soft-gray">Peer-to-peer credit system</p>
            </div>
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

        {/* Summary Stats */}
        <div className="px-6 py-4 border-b border-border-subtle grid grid-cols-3 gap-4 flex-shrink-0">
          <div className="text-center">
            <div className="text-2xl font-display font-bold text-glow-cyan">
              {creditLines.length}
            </div>
            <div className="text-xs text-soft-gray uppercase tracking-wider">
              Credit Lines
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display font-bold text-glow-gold">
              {totalCredit}
            </div>
            <div className="text-xs text-soft-gray uppercase tracking-wider">
              Total Limit
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-display font-bold ${totalBalance >= 0 ? 'text-glow-cyan' : 'text-red-400'}`}>
              {totalBalance >= 0 ? '+' : ''}{totalBalance}
            </div>
            <div className="text-xs text-soft-gray uppercase tracking-wider">
              Net Balance
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-border-subtle flex gap-4 flex-shrink-0">
          {(['lines', 'transfer', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-2 font-display text-sm uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-glow-cyan text-glow-cyan'
                  : 'border-transparent text-soft-gray hover:text-mycelium-white'
              }`}
            >
              {tab === 'lines' && 'Credit Lines'}
              {tab === 'transfer' && 'Transfer'}
              {tab === 'history' && 'History'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Credit Lines Tab */}
          {activeTab === 'lines' && (
            <div className="space-y-4">
              {creditLines.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-moss flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-soft-gray">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v8M8 12h8" />
                    </svg>
                  </div>
                  <p className="text-soft-gray mb-4">No credit lines yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary px-6 py-2 rounded-lg"
                  >
                    Create First Credit Line
                  </button>
                </div>
              ) : (
                <>
                  {creditLines.map((line) => {
                    const otherPeerId = line.peerId1 === localPeerId ? line.peerId2 : line.peerId1;
                    const peer = peers.get(otherPeerId);
                    const usagePercent = Math.abs(line.balance) / line.limit * 100;

                    return (
                      <div
                        key={line.id}
                        className="p-4 bg-moss rounded-lg border border-border-subtle"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-glow-cyan-dim flex items-center justify-center">
                              <span className="text-lg font-display font-bold text-glow-cyan">
                                {(peer?.name || 'P').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-display font-semibold text-mycelium-white">
                                {peer?.name || `Peer-${otherPeerId.slice(0, 8)}`}
                              </div>
                              <div className="text-xs text-soft-gray">
                                Created {formatTimeAgo(line.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-display font-bold ${line.balance >= 0 ? 'text-glow-cyan' : 'text-red-400'}`}>
                              {line.balance >= 0 ? '+' : ''}{line.balance}
                            </div>
                            <div className="text-xs text-soft-gray">
                              / {line.limit} limit
                            </div>
                          </div>
                        </div>

                        <div className="h-2 bg-bark rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              line.balance >= 0 ? 'bg-glow-cyan' : 'bg-red-400'
                            }`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full p-4 border border-dashed border-border-subtle rounded-lg text-soft-gray hover:border-glow-cyan hover:text-glow-cyan transition-colors flex items-center justify-center gap-2"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v8M8 12h8" />
                    </svg>
                    Add Credit Line
                  </button>
                </>
              )}
            </div>
          )}

          {/* Transfer Tab */}
          {activeTab === 'transfer' && (
            <div className="space-y-4">
              {creditPeers.length === 0 ? (
                <div className="text-center py-8 text-soft-gray">
                  <p>Create credit lines first to enable transfers</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-display text-soft-gray mb-2">
                      Send To
                    </label>
                    <select
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className="w-full px-4 py-3 bg-moss border border-border-subtle rounded-lg text-mycelium-white focus:border-glow-cyan focus:outline-none"
                    >
                      <option value="">Select peer...</option>
                      {creditPeers.map((peer) => (
                        <option key={peer.id} value={peer.id}>
                          {peer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-display text-soft-gray mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(Number(e.target.value))}
                      min="1"
                      className="w-full px-4 py-3 bg-moss border border-border-subtle rounded-lg text-mycelium-white focus:border-glow-cyan focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-display text-soft-gray mb-2">
                      Memo (optional)
                    </label>
                    <input
                      type="text"
                      value={transferMemo}
                      onChange={(e) => setTransferMemo(e.target.value)}
                      placeholder="What's this for?"
                      className="w-full px-4 py-3 bg-moss border border-border-subtle rounded-lg text-mycelium-white placeholder-soft-gray focus:border-glow-cyan focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleTransfer}
                    disabled={!transferTo || transferAmount <= 0}
                    className="w-full btn-primary px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Transfer
                  </button>
                </>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-soft-gray">
                  <p>No transactions yet</p>
                </div>
              ) : (
                transactions.map((tx) => {
                  const isOutgoing = tx.from === localPeerId;
                  const otherPeerId = isOutgoing ? tx.to : tx.from;
                  const peer = peers.get(otherPeerId);

                  return (
                    <div
                      key={tx.id}
                      className="p-4 bg-moss rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isOutgoing ? 'bg-red-400/20' : 'bg-glow-cyan-dim'
                        }`}>
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={isOutgoing ? 'text-red-400 rotate-180' : 'text-glow-cyan'}
                          >
                            <path d="M12 19V5M5 12l7-7 7 7" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-display text-mycelium-white">
                            {isOutgoing ? 'Sent to' : 'Received from'}{' '}
                            <span className="font-semibold">
                              {peer?.name || `Peer-${otherPeerId.slice(0, 8)}`}
                            </span>
                          </div>
                          {tx.memo && (
                            <div className="text-sm text-soft-gray">{tx.memo}</div>
                          )}
                          <div className="text-xs text-soft-gray">
                            {formatTimeAgo(tx.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className={`text-lg font-display font-bold ${
                        isOutgoing ? 'text-red-400' : 'text-glow-cyan'
                      }`}>
                        {isOutgoing ? '-' : '+'}{tx.amount}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Create Credit Line Modal */}
        {showCreateModal && (
          <div className="absolute inset-0 bg-void/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-forest-floor border border-border-subtle rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-mycelium-white">
                  Create Credit Line
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-soft-gray hover:text-mycelium-white"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-soft-gray text-sm">
                Establish a mutual credit line with a trusted peer. Both parties
                can draw on this credit within the agreed limit.
              </p>

              <div>
                <label className="block text-sm font-display text-soft-gray mb-2">
                  Select Peer
                </label>
                <select
                  value={selectedPeer}
                  onChange={(e) => setSelectedPeer(e.target.value)}
                  className="w-full px-4 py-3 bg-moss border border-border-subtle rounded-lg text-mycelium-white focus:border-glow-cyan focus:outline-none"
                >
                  <option value="">Choose a peer...</option>
                  {availablePeers.map((peer) => (
                    <option key={peer.id} value={peer.id}>
                      {peer.name} (Rep: {Math.round(peer.reputation * 100)}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-display text-soft-gray mb-2">
                  Credit Limit: {creditLimit}
                </label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-soft-gray mt-1">
                  <span>10</span>
                  <span>1000</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-outline px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCreditLine}
                  disabled={!selectedPeer}
                  className="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Create Line
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
