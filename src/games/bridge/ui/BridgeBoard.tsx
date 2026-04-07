/**
 * Bridge game board — 4-player layout with bidding and trick play.
 */

import { useMemo } from 'react';
import { useBridgeStore } from '../store/gameStore';
import type { Seat, CardId, BidAction, Bid } from '../engine/types';
import { SEATS, BID_SUITS, nextSeat, teamOf } from '../engine/types';
import { suitOf, rankOf, rankLabel, suitSymbol, suitColor, bidSuitSymbol, sortHand } from '../engine/deck';
import { isLegalBid } from '../engine/game';
import { ArrowLeft, RotateCcw } from 'lucide-react';

interface BridgeBoardProps {
  onQuit: () => void;
}

const SEAT_LABELS: Record<Seat, string> = {
  north: 'North (Partner)',
  east: 'East',
  south: 'You (South)',
  west: 'West',
};

const SEAT_POSITIONS: Record<Seat, { top?: string; bottom?: string; left?: string; right?: string }> = {
  north: { top: '8px', left: '50%' },
  south: { bottom: '8px', left: '50%' },
  east: { right: '8px', top: '50%' },
  west: { left: '8px', top: '50%' },
};

export function BridgeBoard({ onQuit }: BridgeBoardProps) {
  const { gameState, legalCards, makeBid, playCardAction, startNewGame, lastTrick } = useBridgeStore();
  const { phase, humanSeat, contract, dummy, currentPlayer, currentTrick, tricksWon } = gameState;

  const isHumanTurn = phase === 'bidding'
    ? gameState.currentBidder === humanSeat
    : currentPlayer === humanSeat || (currentPlayer === dummy && contract?.declarer === humanSeat);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1, background: 'var(--bg)', padding: '8px',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <button onClick={onQuit} className="action-btn secondary" style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 12,
        }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
          <span>N/S: {tricksWon.ns}</span>
          <span>E/W: {tricksWon.ew}</span>
          {contract && (
            <span style={{ color: 'var(--accent)' }}>
              {contract.level}{bidSuitSymbol(contract.suit)}
              {contract.doubled ? ' X' : ''}{contract.redoubled ? ' XX' : ''}
            </span>
          )}
        </div>

        <button onClick={startNewGame} className="action-btn secondary" style={{
          padding: '6px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Table area */}
      <div style={{
        flex: 1, position: 'relative',
        background: 'var(--board-bg)',
        borderRadius: 16,
        minHeight: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Seat labels */}
        {SEATS.map(seat => (
          <div key={seat} style={{
            position: 'absolute',
            ...getSeatLabelPosition(seat),
            transform: seat === 'north' || seat === 'south' ? 'translateX(-50%)' : 'translateY(-50%)',
            fontSize: 10, fontWeight: 700,
            color: seat === humanSeat ? 'var(--player)' :
                   seat === dummy && phase === 'playing' ? 'var(--accent)' :
                   currentPlayer === seat || gameState.currentBidder === seat ? 'var(--hit)' :
                   'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: 0.8,
          }}>
            {SEAT_LABELS[seat]}
            {phase === 'playing' && seat === dummy && ' (Dummy)'}
          </div>
        ))}

        {/* Current trick display */}
        {phase === 'playing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {/* North card */}
            <TrickCard seat="north" trick={currentTrick.cards} />
            <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
              {/* West card */}
              <TrickCard seat="west" trick={currentTrick.cards} />
              {/* Center label */}
              <div style={{ width: 40, textAlign: 'center', fontSize: 10, color: 'var(--text-dim)' }}>
                Trick {gameState.tricks.length + 1}
              </div>
              {/* East card */}
              <TrickCard seat="east" trick={currentTrick.cards} />
            </div>
            {/* South card */}
            <TrickCard seat="south" trick={currentTrick.cards} />
          </div>
        )}

        {/* Bidding display */}
        {phase === 'bidding' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
              Bidding
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', maxWidth: 300 }}>
              {gameState.bidHistory.map((bid, i) => {
                const seat = getSeatForBidIndex(gameState.dealer, i);
                return (
                  <div key={i} style={{
                    padding: '3px 8px', borderRadius: 6,
                    background: teamOf(seat) === 'ns' ? 'var(--player-dim)' : 'var(--opponent-dim)',
                    fontSize: 11, fontWeight: 700,
                    color: bid.type === 'pass' ? 'var(--text-dim)' : 'var(--text)',
                  }}>
                    {bid.type === 'pass' ? 'Pass' :
                     bid.type === 'double' ? 'X' :
                     bid.type === 'redouble' ? 'XX' :
                     `${(bid as Bid).level}${bidSuitSymbol((bid as Bid).suit)}`}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dummy's hand (visible when playing) */}
      {phase === 'playing' && dummy && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textAlign: 'center', marginBottom: 4 }}>
            Dummy ({dummy.toUpperCase()})
          </div>
          <HandDisplay
            hand={sortHand(gameState.hands[dummy])}
            playable={currentPlayer === dummy && contract?.declarer === humanSeat}
            legalCards={currentPlayer === dummy ? legalCards : []}
            onPlay={playCardAction}
            small
          />
        </div>
      )}

      {/* Human's hand */}
      <div style={{ marginTop: 4 }}>
        <HandDisplay
          hand={sortHand(gameState.hands[humanSeat])}
          playable={phase === 'playing' && currentPlayer === humanSeat}
          legalCards={currentPlayer === humanSeat ? legalCards : []}
          onPlay={playCardAction}
        />
      </div>

      {/* Bidding box */}
      {phase === 'bidding' && isHumanTurn && (
        <BiddingBox state={gameState} onBid={makeBid} />
      )}

      {/* Game over overlay */}
      {gameState.gameOver && gameState.result && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 20, padding: '32px 40px',
            textAlign: 'center', animation: 'slide-up 0.4s ease-out',
            border: '1px solid var(--glass-border)',
            minWidth: 280,
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>
              {gameState.result.startsWith('Made') ? '🎉' :
               gameState.result === 'All Pass — no contract' ? '🤷' : '😔'}
            </div>
            <h2 style={{ color: 'var(--text)', margin: '0 0 8px', fontSize: 22, fontWeight: 900 }}>
              {gameState.result}
            </h2>
            {contract && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>
                Contract: {contract.level}{bidSuitSymbol(contract.suit)}
                {contract.doubled ? ' Doubled' : ''}{contract.redoubled ? ' Redoubled' : ''}
                {' by '}{contract.declarer.toUpperCase()}
              </div>
            )}
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              N/S: {gameState.score.ns} | E/W: {gameState.score.ew}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="action-btn primary" style={{ flex: 1 }} onClick={startNewGame}>
                New Hand
              </button>
              <button className="action-btn secondary" style={{ flex: 1 }} onClick={onQuit}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function HandDisplay({ hand, playable, legalCards, onPlay, small }: {
  hand: CardId[];
  playable: boolean;
  legalCards: CardId[];
  onPlay: (card: CardId) => void;
  small?: boolean;
}) {
  const cardW = small ? 38 : 48;
  const cardH = small ? 54 : 68;
  const overlap = small ? 22 : 28;

  return (
    <div style={{
      display: 'flex', justifyContent: 'center',
      padding: '4px 0',
    }}>
      {hand.map((cardId, i) => {
        const suit = suitOf(cardId);
        const rank = rankOf(cardId);
        const color = suitColor(suit);
        const isLegal = legalCards.includes(cardId);
        const canPlay = playable && isLegal;

        return (
          <div
            key={cardId}
            onClick={canPlay ? () => onPlay(cardId) : undefined}
            style={{
              width: cardW, height: cardH,
              borderRadius: 6,
              background: 'var(--card-face)',
              border: `1.5px solid ${canPlay ? 'var(--card-highlight)' : 'var(--card-border)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center',
              cursor: canPlay ? 'pointer' : 'default',
              opacity: playable && !isLegal ? 0.4 : 1,
              marginLeft: i > 0 ? -overlap + cardW : 0,
              marginRight: i > 0 ? 0 : 0,
              position: 'relative',
              zIndex: i,
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: canPlay ? '0 0 8px var(--card-highlight)' : '0 1px 3px rgba(0,0,0,0.2)',
              transform: canPlay ? 'translateY(-4px)' : 'none',
              flexShrink: 0,
              fontSize: small ? 10 : 13,
              fontWeight: 800,
              fontFamily: 'var(--font)',
              color: color === 'red' ? 'var(--card-red)' : 'var(--card-black)',
            }}
          >
            <div>{rankLabel(rank)}</div>
            <div style={{ fontSize: small ? 12 : 16 }}>{suitSymbol(suit)}</div>
          </div>
        );
      })}
    </div>
  );
}

function TrickCard({ seat, trick }: {
  seat: Seat;
  trick: { seat: Seat; card: CardId }[];
}) {
  const played = trick.find(t => t.seat === seat);
  if (!played) {
    return <div style={{ width: 40, height: 54, borderRadius: 4, border: '1px dashed var(--card-empty)', opacity: 0.3 }} />;
  }

  const suit = suitOf(played.card);
  const rank = rankOf(played.card);
  const color = suitColor(suit);

  return (
    <div style={{
      width: 40, height: 54, borderRadius: 4,
      background: 'var(--card-face)',
      border: '1px solid var(--card-border)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800, fontFamily: 'var(--font)',
      color: color === 'red' ? 'var(--card-red)' : 'var(--card-black)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      animation: 'slide-up 0.2s ease-out',
    }}>
      <div>{rankLabel(rank)}</div>
      <div style={{ fontSize: 14 }}>{suitSymbol(suit)}</div>
    </div>
  );
}

function BiddingBox({ state, onBid }: { state: BridgeState; onBid: (action: BidAction) => void }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--glass-border)',
      borderRadius: 14, padding: 12, marginTop: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        Your Bid
      </div>

      {/* Bid grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3, marginBottom: 8 }}>
        {([1, 2, 3, 4, 5, 6, 7] as const).map(level =>
          BID_SUITS.map(suit => {
            const bid: BidAction = { type: 'bid', level, suit };
            const legal = isLegalBid(state, bid);
            return (
              <button
                key={`${level}${suit}`}
                onClick={() => legal && onBid(bid)}
                disabled={!legal}
                style={{
                  padding: '4px 2px', borderRadius: 4, border: 'none',
                  background: legal ? 'var(--surface-2)' : 'transparent',
                  color: legal
                    ? (suit === 'hearts' || suit === 'diamonds' ? 'var(--card-red)' : 'var(--text)')
                    : 'var(--text-dim)',
                  fontSize: 10, fontWeight: 700, cursor: legal ? 'pointer' : 'default',
                  opacity: legal ? 1 : 0.25,
                  fontFamily: 'var(--font)',
                }}
              >
                {level}{bidSuitSymbol(suit)}
              </button>
            );
          })
        ).flat()}
      </div>

      {/* Special bids */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="action-btn secondary"
          onClick={() => onBid({ type: 'pass' })}
          style={{ flex: 1, height: 32, fontSize: 12 }}
        >
          Pass
        </button>
        {isLegalBid(state, { type: 'double' }) && (
          <button
            className="action-btn secondary"
            onClick={() => onBid({ type: 'double' })}
            style={{ flex: 1, height: 32, fontSize: 12, color: 'var(--opponent)' }}
          >
            Double
          </button>
        )}
        {isLegalBid(state, { type: 'redouble' }) && (
          <button
            className="action-btn secondary"
            onClick={() => onBid({ type: 'redouble' })}
            style={{ flex: 1, height: 32, fontSize: 12, color: 'var(--hit)' }}
          >
            Redouble
          </button>
        )}
      </div>
    </div>
  );
}

function getSeatLabelPosition(seat: Seat) {
  switch (seat) {
    case 'north': return { top: '8px', left: '50%' };
    case 'south': return { bottom: '8px', left: '50%' };
    case 'east': return { right: '12px', top: '50%' };
    case 'west': return { left: '12px', top: '50%' };
  }
}

function getSeatForBidIndex(dealer: Seat, index: number): Seat {
  let seat = dealer;
  for (let i = 0; i < index; i++) seat = nextSeat(seat);
  return seat;
}
