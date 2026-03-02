# TEST_PLAN.md - Tell it!

This plan outlines the manual verification steps to ensure the stability and core functionality of the Tell it! application.

## 1. Authentication
- [ ] Login via NIP-07 Browser Extension
- [ ] Login via Private Key (nsec/hex)
- [ ] Generate New Identity (Onboarding flow)
- [ ] Logout functionality (clear local storage and state)

## 2. Messaging (NIP-17)
- [ ] Send message to another user
- [ ] Receive real-time message notifications (Toasts & Badges)
- [ ] Persistent message history across reloads (Dexie cache)
- [ ] Rich media rendering in chat bubbles
- [ ] Mark conversation as read on entry

## 3. Feed & Discovery
- [ ] Global feed loading
- [ ] Search for profiles and notes
- [ ] Trending hashtags (#TellIt)
- [ ] Profile tabs (Posts, Replies, Media, Articles, Likes)

## 4. Interactions
- [ ] Like a post
- [ ] Repost a note
- [ ] Zap a user (Lightning Network)
- [ ] Follow/Unfollow users
- [ ] Report content

## 5. Profile Management
- [ ] Edit profile details (name, about, banner, picture)
- [ ] Set user status (Kind 30315)
- [ ] View following/followers list
