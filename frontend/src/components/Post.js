// frontend/src/components/Post.js
import { useState, useContext } from 'react';
import { CircularProgress } from '@mui/material';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import '../styles/Post.css';

const PROD_API_URL = 'https://timeline-api-7aj8.onrender.com/api';
const API_URL = process.env.NODE_ENV === 'production' ? PROD_API_URL : 'http://localhost:5000/api';

// ── helpers ───────────────────────────────────────────────────────────────────

const getInitials = (username) => {
  if (!username) return '?';
  return username.slice(0, 2).toUpperCase();
};

const formatYear = (year) => {
  if (year == null) return '';
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
};

const STATUS_META = {
  Verified:      { label: 'Verified',  className: 'badge-verified' },
  Disputed:      { label: 'Disputed',  className: 'badge-disputed' },
  'Not Applicable': { label: 'N/A',    className: 'badge-na'       },
  Pending:       { label: 'Pending',   className: 'badge-pending'  },
};

// ── component ─────────────────────────────────────────────────────────────────

const Post = ({ post, onVoteUpdate }) => {
  const { user } = useContext(AuthContext);

  // vote state
  const [loading, setLoading]   = useState(false);
  const [voteError, setVoteError] = useState(null);

  // AI context panel
  const [aiContext, setAiContext]             = useState(post.aiContext || '');
  const [contextLoading, setContextLoading]  = useState(false);
  const [contextError, setContextError]      = useState(null);
  const [contextOpen, setContextOpen]        = useState(false);

  // RAG verification panel
  const [verificationStatus, setVerificationStatus]   = useState(post.verificationStatus || 'Pending');
  const [verificationResult, setVerificationResult]   = useState(post.aiVerificationResult || '');
  const [verifyLoading, setVerifyLoading]             = useState(false);
  const [verifyError, setVerifyError]                 = useState(null);
  const [verifyOpen, setVerifyOpen]                   = useState(false);

  const userVote = (user?._id && post.userVotes)
    ? post.userVotes.find(v => v.user === user._id)?.voteType
    : null;

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleVote = async (voteType) => {
    if (!user) { alert('Please log in to vote'); return; }
    try {
      setLoading(true);
      setVoteError(null);
      const res = await axios.post(
        `${API_URL}/posts/${post._id}/vote`,
        { voteType },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      if (onVoteUpdate) onVoteUpdate(res.data);
    } catch {
      setVoteError('Vote failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleContext = async () => {
    // If already loaded, just toggle visibility
    if (aiContext) { setContextOpen(v => !v); return; }

    setContextOpen(true);
    try {
      setContextLoading(true);
      setContextError(null);
      const res = await axios.post(`${API_URL}/posts/${post._id}/context`);
      setAiContext(res.data.context);
    } catch {
      setContextError('Could not load context.');
    } finally {
      setContextLoading(false);
    }
  };

  const handleToggleVerify = () => setVerifyOpen(v => !v);

  const handleRunVerify = async () => {
    if (verificationStatus !== 'Pending') return;
    try {
      setVerifyLoading(true);
      setVerifyError(null);
      const res = await axios.post(`${API_URL}/posts/${post._id}/verify-claim`);
      const resultText = res.data.verification;
      setVerificationResult(resultText);

      let newStatus = 'Pending';
      if (resultText.startsWith('VERDICT: VERIFIED'))          newStatus = 'Verified';
      else if (resultText.startsWith('VERDICT: DISPUTED'))     newStatus = 'Disputed';

      setVerificationStatus(newStatus);
      if (onVoteUpdate) onVoteUpdate({ ...post, verificationStatus: newStatus, aiVerificationResult: resultText });
    } catch {
      setVerifyError('Fact check failed. Check server logs.');
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── derived display values ───────────────────────────────────────────────────

  const status     = STATUS_META[verificationStatus] ?? STATUS_META.Pending;
  const username   = post.author?.username || 'anonymous';
  const isVerified = post.author?.isVerified;
  const upCount    = post.votes?.up   ?? 0;
  const downCount  = post.votes?.down ?? 0;

  // AI panel state: what to show in the expandable area
  // 'context' | 'verify'
  const [activePanel, setActivePanel] = useState(null);

  const togglePanel = (panel) => {
    if (activePanel === panel) { setActivePanel(null); return; }
    setActivePanel(panel);
    if (panel === 'context' && !aiContext) handleToggleContext();
  };

  return (
    <article className="post-root">

      {/* ── header ── */}
      <header className="post-header">
        <div className="post-location-row">
          <h2 className="post-location">{post.location?.name || 'Unknown Location'}</h2>
          <span className={`post-badge ${status.className}`}>{status.label}</span>
        </div>
        <div className="post-meta-row">
          <div className="post-avatar" aria-hidden="true">{getInitials(username)}</div>
          <span className="post-author">
            <strong>{username}</strong>
            {isVerified && <span className="verified-check" title="Verified author">✓</span>}
          </span>
          <span className="post-year">{formatYear(post.year)}</span>
        </div>
      </header>

      {/* ── body ── */}
      <p className="post-body">{post.content}</p>

      {/* ── error row ── */}
      {(voteError || verifyError || contextError) && (
        <p className="post-error">
          {voteError || verifyError || contextError}
        </p>
      )}

      {/* ── action bar ── */}
      <div className="post-actions">

        {/* votes */}
        <button
          className={`vote-btn${userVote === 'up' ? ' active-up' : ''}`}
          onClick={() => handleVote('up')}
          disabled={loading}
          aria-label="Upvote"
        >
          <UpIcon />
          <span>{upCount}</span>
        </button>

        <button
          className={`vote-btn${userVote === 'down' ? ' active-down' : ''}`}
          onClick={() => handleVote('down')}
          disabled={loading}
          aria-label="Downvote"
        >
          <DownIcon />
          <span>{downCount}</span>
        </button>

        <div className="action-divider" />

        {/* AI context toggle */}
        <button
          className={`ai-btn${activePanel === 'context' ? ' ai-btn-active' : ''}`}
          onClick={() => togglePanel('context')}
        >
          <span className="ai-dot" />
          Context
        </button>

        {/* RAG verify toggle — only show if there's something to show or run */}
        <button
          className={`ai-btn${activePanel === 'verify' ? ' ai-btn-active' : ''}`}
          onClick={() => togglePanel('verify')}
        >
          <span className="ai-dot" />
          {verificationStatus === 'Pending' ? 'Fact Check' : 'Verdict'}
        </button>

      </div>

      {/* ── expandable AI context panel ── */}
      {activePanel === 'context' && (
        <div className="ai-panel">
          <span className="ai-panel-label">AI Historical Context</span>
          {contextLoading && (
            <div className="ai-loading">
              <CircularProgress size={14} sx={{ color: 'rgba(232,201,126,0.6)' }} />
              <span>Generating…</span>
            </div>
          )}
          {contextError && <p className="post-error">{contextError}</p>}
          {aiContext && <p className="ai-panel-text">{aiContext}</p>}
        </div>
      )}

      {/* ── expandable RAG verify panel ── */}
      {activePanel === 'verify' && (
        <div className="ai-panel">
          <span className="ai-panel-label">RAG Fact Check</span>

          {verificationStatus === 'Pending' && !verificationResult && (
            <button
              className="fact-check-btn"
              onClick={handleRunVerify}
              disabled={verifyLoading}
            >
              {verifyLoading
                ? <><CircularProgress size={11} sx={{ color: 'currentColor' }} /> Checking…</>
                : <><GavelIcon /> Run Fact Check</>
              }
            </button>
          )}

          {verifyError && <p className="post-error">{verifyError}</p>}

          {verificationResult && (
            <div className={`verdict-bar verdict-${verificationStatus.toLowerCase()}`}>
              <strong className="verdict-label">{verificationStatus.toUpperCase()}</strong>
              <p className="verdict-text">{verificationResult}</p>
            </div>
          )}
        </div>
      )}

    </article>
  );
};

// ── inline SVG icons (no MUI dep for these) ───────────────────────────────────

const UpIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 4l8 8H4z"/>
  </svg>
);

const DownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 20l-8-8h16z"/>
  </svg>
);

const GavelIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
);

export default Post;