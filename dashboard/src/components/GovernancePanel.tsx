import { useState, useCallback, useMemo } from 'react';
import type { Proposal, Vote, NormalizedPeer } from '@/types';

interface GovernancePanelProps {
  localPeerId: string | null;
  peers: Map<string, NormalizedPeer>;
  proposals?: Proposal[];
  onCreateProposal?: (proposal: Omit<Proposal, 'id' | 'createdAt' | 'status' | 'votesFor' | 'votesAgainst'>) => void;
  onVote?: (vote: Vote) => void;
  onClose?: () => void;
}

// Mock data for demonstration
function getMockProposals(peers: Map<string, NormalizedPeer>): Proposal[] {
  const peerIds = Array.from(peers.keys());
  if (peerIds.length === 0) return [];

  return [
    {
      id: 'prop-1',
      title: 'Increase Reputation Decay Rate',
      description: 'Proposal to increase the reputation decay rate from 1% to 2% per week to encourage more active participation.',
      proposer: peerIds[0],
      createdAt: Date.now() - 86400000 * 3,
      expiresAt: Date.now() + 86400000 * 4,
      status: 'active',
      votesFor: 15,
      votesAgainst: 8,
      quorum: 20,
    },
    {
      id: 'prop-2',
      title: 'Add Resource Contribution Rewards',
      description: 'Introduce automatic reputation boosts for peers who contribute significant bandwidth or storage resources to the network.',
      proposer: peerIds[Math.min(1, peerIds.length - 1)],
      createdAt: Date.now() - 86400000 * 7,
      expiresAt: Date.now() - 86400000 * 1,
      status: 'passed',
      votesFor: 25,
      votesAgainst: 5,
      quorum: 20,
    },
    {
      id: 'prop-3',
      title: 'Lower Credit Line Minimum',
      description: 'Reduce the minimum credit line from 100 to 50 to make it easier for new members to establish credit relationships.',
      proposer: peerIds[Math.min(2, peerIds.length - 1)],
      createdAt: Date.now() - 86400000 * 10,
      expiresAt: Date.now() - 86400000 * 3,
      status: 'rejected',
      votesFor: 8,
      votesAgainst: 18,
      quorum: 20,
    },
  ];
}

export function GovernancePanel({
  localPeerId,
  peers,
  proposals: externalProposals,
  onCreateProposal,
  onVote,
  onClose,
}: GovernancePanelProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'passed' | 'all'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDuration, setNewDuration] = useState(7);
  const [newQuorum, setNewQuorum] = useState(20);
  const [userVotes, setUserVotes] = useState<Map<string, 'for' | 'against'>>(new Map());

  // Use external data if provided, otherwise fall back to mock data
  const proposals = useMemo(
    () => externalProposals && externalProposals.length > 0
      ? externalProposals
      : getMockProposals(peers),
    [externalProposals, peers]
  );

  const filteredProposals = useMemo(() => {
    if (activeTab === 'active') return proposals.filter(p => p.status === 'active');
    if (activeTab === 'passed') return proposals.filter(p => p.status === 'passed');
    return proposals;
  }, [proposals, activeTab]);

  const activeCount = proposals.filter(p => p.status === 'active').length;

  const handleCreateProposal = useCallback(() => {
    if (!newTitle || !newDescription || !localPeerId || !onCreateProposal) return;

    onCreateProposal({
      title: newTitle,
      description: newDescription,
      proposer: localPeerId,
      expiresAt: Date.now() + newDuration * 86400000,
      quorum: newQuorum,
    });

    setShowCreateModal(false);
    setNewTitle('');
    setNewDescription('');
    setNewDuration(7);
    setNewQuorum(20);
  }, [newTitle, newDescription, newDuration, newQuorum, localPeerId, onCreateProposal]);

  const handleVote = useCallback((proposalId: string, vote: 'for' | 'against') => {
    if (!localPeerId || !onVote) return;

    const voteObj: Vote = {
      proposalId,
      voterId: localPeerId,
      vote,
      weight: 1,
      timestamp: Date.now(),
    };

    onVote(voteObj);
    setUserVotes(prev => {
      const next = new Map(prev);
      next.set(proposalId, vote);
      return next;
    });
  }, [localPeerId, onVote]);

  const formatTimeRemaining = (expiresAt: number) => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return 'Ended';

    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

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

  const getStatusColor = (status: Proposal['status']) => {
    switch (status) {
      case 'active': return 'text-glow-cyan bg-glow-cyan-dim';
      case 'passed': return 'text-glow-gold bg-glow-gold-dim';
      case 'rejected': return 'text-red-400 bg-red-400/20';
      case 'expired': return 'text-soft-gray bg-moss';
      default: return 'text-soft-gray bg-moss';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-forest-floor border border-border-subtle rounded-xl shadow-card overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-spore-purple/25 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-spore-purple">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-mycelium-white">
                Governance
              </h2>
              <p className="text-sm text-soft-gray">Network proposals & voting</p>
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

        {/* Stats */}
        <div className="px-6 py-4 border-b border-border-subtle grid grid-cols-3 gap-4 flex-shrink-0">
          <div className="text-center">
            <div className="text-2xl font-display font-bold text-glow-cyan">
              {activeCount}
            </div>
            <div className="text-xs text-soft-gray uppercase tracking-wider">
              Active
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display font-bold text-glow-gold">
              {proposals.filter(p => p.status === 'passed').length}
            </div>
            <div className="text-xs text-soft-gray uppercase tracking-wider">
              Passed
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display font-bold text-spore-purple">
              {proposals.length}
            </div>
            <div className="text-xs text-soft-gray uppercase tracking-wider">
              Total
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-border-subtle flex gap-4 flex-shrink-0">
          {(['active', 'passed', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-2 font-display text-sm uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-spore-purple text-spore-purple'
                  : 'border-transparent text-soft-gray hover:text-mycelium-white'
              }`}
            >
              {tab === 'active' && `Active (${activeCount})`}
              {tab === 'passed' && 'Passed'}
              {tab === 'all' && 'All'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredProposals.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-moss flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-soft-gray">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              </div>
              <p className="text-soft-gray mb-4">No proposals in this category</p>
              {activeTab === 'active' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary px-6 py-2 rounded-lg"
                >
                  Create First Proposal
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProposals.map((proposal) => {
                const proposer = peers.get(proposal.proposer);
                const totalVotes = proposal.votesFor + proposal.votesAgainst;
                const forPercent = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 50;
                const quorumReached = totalVotes >= proposal.quorum;
                const userVote = userVotes.get(proposal.id);

                return (
                  <div
                    key={proposal.id}
                    className="p-4 bg-moss rounded-lg border border-border-subtle"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-display uppercase ${getStatusColor(proposal.status)}`}>
                            {proposal.status}
                          </span>
                          {proposal.status === 'active' && (
                            <span className="text-xs text-soft-gray">
                              {formatTimeRemaining(proposal.expiresAt)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-display font-semibold text-mycelium-white">
                          {proposal.title}
                        </h3>
                        <p className="text-sm text-soft-gray mt-1 line-clamp-2">
                          {proposal.description}
                        </p>
                        <div className="text-xs text-soft-gray mt-2">
                          Proposed by <span className="text-glow-cyan">{proposer?.name || `Peer-${proposal.proposer.slice(0, 8)}`}</span>{' '}
                          {formatTimeAgo(proposal.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Voting Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-glow-cyan font-display font-bold">
                          For: {proposal.votesFor}
                        </span>
                        <span className={`font-display ${quorumReached ? 'text-glow-gold' : 'text-soft-gray'}`}>
                          {totalVotes}/{proposal.quorum} quorum
                        </span>
                        <span className="text-red-400 font-display font-bold">
                          Against: {proposal.votesAgainst}
                        </span>
                      </div>
                      <div className="h-3 bg-bark rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-glow-cyan transition-all duration-500"
                          style={{ width: `${forPercent}%` }}
                        />
                        <div
                          className="h-full bg-red-400 transition-all duration-500"
                          style={{ width: `${100 - forPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Vote Buttons */}
                    {proposal.status === 'active' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVote(proposal.id, 'for')}
                          disabled={!!userVote}
                          className={`flex-1 px-4 py-2 rounded-lg font-display text-sm transition-colors ${
                            userVote === 'for'
                              ? 'bg-glow-cyan text-void'
                              : 'bg-glow-cyan-dim text-glow-cyan hover:bg-glow-cyan hover:text-void'
                          } disabled:opacity-50`}
                        >
                          {userVote === 'for' ? 'Voted For' : 'Vote For'}
                        </button>
                        <button
                          onClick={() => handleVote(proposal.id, 'against')}
                          disabled={!!userVote}
                          className={`flex-1 px-4 py-2 rounded-lg font-display text-sm transition-colors ${
                            userVote === 'against'
                              ? 'bg-red-400 text-void'
                              : 'bg-red-400/20 text-red-400 hover:bg-red-400 hover:text-void'
                          } disabled:opacity-50`}
                        >
                          {userVote === 'against' ? 'Voted Against' : 'Vote Against'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {activeTab === 'active' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full p-4 border border-dashed border-border-subtle rounded-lg text-soft-gray hover:border-spore-purple hover:text-spore-purple transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                  Create New Proposal
                </button>
              )}
            </div>
          )}
        </div>

        {/* Create Proposal Modal */}
        {showCreateModal && (
          <div className="absolute inset-0 bg-void/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-forest-floor border border-border-subtle rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-mycelium-white">
                  Create Proposal
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

              <div>
                <label className="block text-sm font-display text-soft-gray mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Brief, descriptive title..."
                  className="w-full px-4 py-3 bg-moss border border-border-subtle rounded-lg text-mycelium-white placeholder-soft-gray focus:border-spore-purple focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-display text-soft-gray mb-2">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Explain your proposal in detail..."
                  className="w-full px-4 py-3 bg-moss border border-border-subtle rounded-lg text-mycelium-white placeholder-soft-gray focus:border-spore-purple focus:outline-none resize-none h-32"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-display text-soft-gray mb-2">
                    Duration: {newDuration} days
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-display text-soft-gray mb-2">
                    Quorum: {newQuorum} votes
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={newQuorum}
                    onChange={(e) => setNewQuorum(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="p-3 bg-spore-purple/10 border border-spore-purple/30 rounded-lg">
                <p className="text-sm text-soft-gray">
                  <span className="text-spore-purple font-display font-bold">Note:</span> Creating a proposal requires staking reputation. Your stake will be returned if the proposal reaches quorum.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-outline px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProposal}
                  disabled={!newTitle || !newDescription}
                  className="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Create Proposal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
