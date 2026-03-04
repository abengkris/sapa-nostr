# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-03-03

### Added
- **NIP-39 External Identities:** Users can now link and verify GitHub, Twitter, Mastodon, and Telegram accounts.
- **NIP-51 Lists:** Full support for "Interests" (hashtags) and "Pinned Posts".
- **Web of Trust (WoT) Caching:** Implemented localStorage caching for WoT graphs with 1-hour expiry and background refreshing to improve load times.
- **Suggested for You:** New page showing depth-2 network suggestions.
- **Pinned Posts:** Pinned posts now appear at the top of the user's profile feed.
- **Native Sharing:** Added a Share button to posts and profiles using the Web Share API.
- **Verification Guide:** Interactive "How to verify?" guide added to the Profile Edit modal.

### Changed
- **Profile Feed:** Completely refactored `useFeed` to handle tab filtering internally, resolving scroll glitches and content resetting.
- **Search:** Enhanced search with NIP-19 support (npub, nevent, etc.) and better UI.
- **Performance:** Optimized dependency handling in `useLists` and `useFeed` to prevent unnecessary re-renders.

### Fixed
- Fixed build errors related to `NDKWoT` serialization and type mismatches.
- Fixed `useMemo` conditional hook call violations in Profile page.
- Removed toast notifications for every new message to reduce noise.
