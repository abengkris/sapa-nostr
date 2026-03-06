# Verification & Organizational Affiliation

This document explains how **Tell it!** handles user verification (NIP-05) and organizational affiliations.

## NIP-05 Verification

Nostr uses NIP-05 for human-readable identifiers that look like email addresses (e.g., `user@domain.tld`). This provides a layer of trust by linking a public key to a specific domain.

### Verified Badges

**Tell it!** displays a checkmark badge (`BadgeCheck`) next to the names of users with a valid NIP-05 identifier. The color of the badge indicates the type of account:

- **Blue Badge (`text-blue-500`)**: General verified users.
- **Orange Badge (`text-amber-500`)**: Organizational root identities.

## Organizational Affiliation

Organizational affiliation is a feature that visually links a user to a parent entity (company, community, or project) based on their NIP-05 domain.

### Root Identity Discovery

When a user is verified via `name@domain.tld`, the app automatically attempts to find the "root identity" of that domain to establish an affiliation. The discovery process follows these steps:

1.  **Standard Root (`_@domain.tld`)**: The app first checks for the NIP-05 identifier `_@domain.tld`, which is the standard way to represent a domain's primary identity.
2.  **Fallback Root (`domain@domain.tld`)**: If `_@domain.tld` is not found, the app falls back to checking `domain@domain.tld` (e.g., `primal@primal.net`).

### Affiliation Badge

If a root identity is found, a small **Affiliation Badge** (the profile picture of the root identity) is displayed next to the user's verified checkmark.

- **Interaction**: Clicking the user's display name or the affiliation badge opens a modal with more information about the organization and a link to its profile.
- **Root Accounts**: To avoid redundancy, the affiliation badge is suppressed on the profile of the root identity itself (i.e., when the user's NIP-05 name is `_` or matches the domain name).

## Technical Implementation

### `useNIP05` Hook
Validates the NIP-05 identifier for a given public key by querying the `.well-known/nostr.json` file on the domain.

### `useAffiliation` Hook
Handles the discovery and caching of organizational root identities. It includes:
- **Fallback Logic**: Supports both `_` and domain-name local parts.
- **Negative Caching**: Caches failed lookups (`null`) to prevent redundant network requests.
- **Domain-Level Caching**: Shares affiliation data across all users on the same domain.

### `UserIdentity` Component
The central component for rendering user names, verified badges, and affiliation badges. It implements the logic for badge color differentiation and handles the affiliation info modal.
