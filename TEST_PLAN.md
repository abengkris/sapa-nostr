# Test Plan: Critical User Flows

This plan outlines the manual verification steps to ensure the stability and core functionality of the Sapa application.

## 1. Authentication
- [ ] **Login:** Verify user can login using the NIP-07 browser extension (e.g., Alby, Nos2x).
- [ ] **Session Persistence:** Ensure the user remains logged in after refreshing the page.
- [ ] **Logout:** Verify the user can successfully logout and return to the public state.

## 2. Feed & Content
- [ ] **Home Feed:** Confirm the feed loads posts from followed users.
- [ ] **For You Feed:** Verify the "For You" algorithm displays relevant content.
- [ ] **Post Rendering:** Check that posts display correctly, including text, mentions, and basic structure.
- [ ] **Media Display:** Verify that images and videos are rendered (using standard `img` and `video` tags, without optimization proxies).
- [ ] **Infinite Scroll:** Scroll down to ensure more posts are loaded automatically.

## 3. Posting & Interactions
- [ ] **Create Post:** Successfully publish a new text note.
- [ ] **Reply:** Reply to an existing post and verify it appears in the thread.
- [ ] **Like:** Like a post and see the counter update optimistically.
- [ ] **Repost:** Repost content and verify the indicator appears.
- [ ] **Zap:** Open the Zap modal (if available) and verify the UI loads.

## 4. User Profile
- [ ] **Profile Page:** Navigate to a user's profile (e.g., `/[npub]`) and verify details (name, about, stats).
- [ ] **Follow/Unfollow:** Toggle the follow button and verify the state updates.
- [ ] **Followers/Following Lists:** Click on the follower/following counts to view the respective lists.
- [ ] **User Status:** Check if user status (music, general) is displayed correctly.

## 5. Navigation & Search
- [ ] **Sidebar Navigation:** Verify all sidebar links (Home, Search, Notifications, Profile) work.
- [ ] **Search:** Search for a user by name or npub and verify results are returned.
- [ ] **Notifications:** Check the notifications page for recent interactions.

## 6. Stability Checks
- [ ] **Console Errors:** Monitor the browser console for any critical errors or unhandled exceptions.
- [ ] **Responsiveness:** Verify the layout adapts reasonably well to mobile and desktop viewports.
