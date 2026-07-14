feat: playlists, playlist sharing, and social features across the app

Playlists

Built playlist creation with optional cover art upload and public or private visibility toggle
Added build mode UI for adding tracks via unified search across tracks, artists, and albums with artist and album drill down
Implemented drag and drop track reordering, Play, Shuffle, and Add to Queue for a playlist
Added Edit Details, visibility toggle, and Delete Playlist via a slide up action sheet
Denormalized playlist tracks for fast ordered playback and persistent track state

Playlist Sharing

Fixed playlist detail endpoint to allow non owners to view public playlists, previously blocked everyone but the owner
Added playlist follow and unfollow backend with a new playlist_follows table and a read only panel for viewing another user's public playlist
Wired Playlists You Follow in the Profile Panel to real followed playlist data, replacing the mocked row
Mounted the public playlist viewer across all five screens that support it, Search, My Music, Home, Radio, and Bulletin

Social and Discovery

Extended unified search to surface musicians and users alongside tracks, artists, and albums
Built public user profile viewing with real playlist, follower, and following counts
Added follow and unfollow for other users, with optimistic UI updates and real counts on your own profile

Library and Playback Fixes

Diagnosed and repaired CSV encoding corruption that was breaking fuzzy audio matching for a subset of tracks
Fixed Recently Played to persist correctly, backend driven and capped at 15
Fixed home feed personalization, onboarding selected artists were not populating suggestions due to a favorite_artists object versus string mismatch in the query
