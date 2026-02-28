import { NDKEvent } from "@nostr-dev-kit/ndk";

export interface ScoringContext {
  viewerPubkey: string;
  followingSet: Set<string>;        
  followsOfFollowsSet: Set<string>; 
  interactionHistory: Map<string, number>; 
  mutedSet: Set<string>;            
}

export interface ScoredEvent {
  event: NDKEvent;
  score: number;
  signals: Record<string, number>; 
}

const WEIGHTS = {
  isFollowing: 50,        
  isFollowOfFollow: 20,   
  frequentInteraction: 30, 
  hasMedia: 5,            
  hasLongContent: 3,      
  isReply: -10,           
  isRepost: 5,            
  networkReaction: 15,    
  networkReply: 10,       
} as const;

export function scoreEvent(
  event: NDKEvent,
  ctx: ScoringContext,
  networkActivity?: Map<string, { reactions: Set<string>; replies: Set<string> }>
): ScoredEvent {
  const signals: Record<string, number> = {};
  let score = 0;

  if (ctx.mutedSet.has(event.pubkey)) {
    return { event, score: -999, signals: { muted: -999 } };
  }

  if (ctx.followingSet.has(event.pubkey)) {
    signals.isFollowing = WEIGHTS.isFollowing;
    score += WEIGHTS.isFollowing;
  } else if (ctx.followsOfFollowsSet.has(event.pubkey)) {
    signals.isFollowOfFollow = WEIGHTS.isFollowOfFollow;
    score += WEIGHTS.isFollowOfFollow;
  }

  const interactionCount = ctx.interactionHistory.get(event.pubkey) ?? 0;
  if (interactionCount > 0) {
    const interactionBoost = Math.min(interactionCount * 5, WEIGHTS.frequentInteraction);
    signals.frequentInteraction = interactionBoost;
    score += interactionBoost;
  }

  const content = event.content ?? "";
  if (content.length > 140) {
    signals.hasLongContent = WEIGHTS.hasLongContent;
    score += WEIGHTS.hasLongContent;
  }

  const hasMedia = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|mp4|mov)/i.test(content);
  if (hasMedia) {
    signals.hasMedia = WEIGHTS.hasMedia;
    score += WEIGHTS.hasMedia;
  }

  const eTags = event.tags.filter(t => t[0] === "e");
  const pTags = event.tags.filter(t => t[0] === "p");
  const isReply = eTags.length > 0;
  if (isReply) {
    const replyTarget = pTags[pTags.length - 1]?.[1];
    if (replyTarget && !ctx.followingSet.has(replyTarget)) {
      signals.isReply = WEIGHTS.isReply;
      score += WEIGHTS.isReply;
    }
  }

  if (networkActivity) {
    const activity = networkActivity.get(event.id);
    if (activity) {
      if (activity.reactions.size > 0) {
        const reactionBoost = Math.min(
          activity.reactions.size * WEIGHTS.networkReaction,
          WEIGHTS.networkReaction * 5
        );
        signals.networkReaction = reactionBoost;
        score += reactionBoost;
      }
      if (activity.replies.size > 0) {
        const replyBoost = Math.min(
          activity.replies.size * WEIGHTS.networkReply,
          WEIGHTS.networkReply * 5
        );
        signals.networkReply = replyBoost;
        score += replyBoost;
      }
    }
  }

  const ageHours = (Date.now() / 1000 - (event.created_at ?? 0)) / 3600;
  let freshnessScore = 0;
  if (ageHours < 1) freshnessScore = 0;
  else if (ageHours < 6) freshnessScore = -10;
  else if (ageHours < 24) freshnessScore = -30;
  else if (ageHours < 72) freshnessScore = -60;
  else freshnessScore = -100;

  signals.freshness = freshnessScore;
  score += freshnessScore;

  return { event, score, signals };
}

export function rankEvents(
  events: NDKEvent[],
  ctx: ScoringContext,
  networkActivity?: Map<string, { reactions: Set<string>; replies: Set<string> }>
): ScoredEvent[] {
  return events
    .map(e => scoreEvent(e, ctx, networkActivity))
    .filter(se => se.score > -999) 
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.event.created_at ?? 0) - (a.event.created_at ?? 0);
    });
}
